"""Pengujian ringkasan dashboard."""

from datetime import UTC, date, datetime, timedelta

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import WIB
from app.models import OrderStatus, Priority
from app.services.dashboard import build_dashboard
from tests.support import login, seed_log, seed_material, seed_order

FIXED_NOW = datetime(2026, 11, 5, 10, 0, tzinfo=UTC)
TODAY = FIXED_NOW.date()


def _wib_now() -> datetime:
    """Waktu WIB saat pengujian dijalankan, untuk endpoint nyata."""

    return datetime.now(UTC).astimezone(WIB)


async def test_dashboard_requires_auth(client: AsyncClient) -> None:
    response = await client.get("/api/dashboard")
    assert response.status_code == 401


async def test_dashboard_all_roles_can_read(
    client: AsyncClient,
    users: dict,
) -> None:
    for role in ("admin", "operator", "qc"):
        await login(client, role)
        response = await client.get("/api/dashboard")
        assert response.status_code == 200


async def test_dashboard_empty_state(
    client: AsyncClient,
    users: dict,
) -> None:
    await login(client, "admin")
    response = await client.get("/api/dashboard")
    assert response.status_code == 200
    body = response.json()

    assert body["business_date"] == _wib_now().date().isoformat()
    assert body["kpis"] == {
        "active_orders": 0,
        "new_orders_today": 0,
        "today_output": 0,
        "yesterday_output": 0,
        "today_reject": 0,
        "today_reject_ratio": 0.0,
        "on_time_delivery_ratio": None,
        "completed_orders_30d": 0,
        "on_time_orders_30d": 0,
    }
    assert len(body["daily_output"]) == 7
    assert all(item["output_qty"] == 0 for item in body["daily_output"])
    assert [item["stage"] for item in body["reject_breakdown"]] == [
        "cutting",
        "jahit",
        "finishing",
        "qc",
    ]
    assert all(item["reject_qty"] == 0 for item in body["reject_breakdown"])
    assert [item["status"] for item in body["pipeline"]] == [
        "menunggu",
        "cutting",
        "jahit",
        "finishing",
        "qc",
    ]
    assert all(item["order_count"] == 0 for item in body["pipeline"])
    assert body["upcoming_deadlines"] == []
    assert body["critical_stock"] == []


async def test_dashboard_order_and_pipeline_metrics(
    client: AsyncClient,
    users: dict,
    catalog: dict,
    session: AsyncSession,
) -> None:
    statuses = [
        (OrderStatus.MENUNGGU, 10),
        (OrderStatus.CUTTING, 20),
        (OrderStatus.JAHIT, 30),
        (OrderStatus.FINISHING, 40),
        (OrderStatus.QC, 50),
    ]
    for index, (status, quantity) in enumerate(statuses):
        await seed_order(
            session,
            catalog,
            code=f"DSH-{index}",
            status=status,
            quantity=quantity,
        )

    completed = await seed_order(
        session,
        catalog,
        code="DSH-SELESAI",
        status=OrderStatus.SELESAI,
        quantity=60,
    )
    cancelled = await seed_order(
        session,
        catalog,
        code="DSH-BATAL",
        status=OrderStatus.DIBATALKAN,
        quantity=70,
    )
    archived = await seed_order(
        session,
        catalog,
        code="DSH-ARSIP",
        status=OrderStatus.MENUNGGU,
        quantity=80,
    )
    archived.deleted_at = datetime.now(UTC)
    await session.commit()

    await login(client, "operator")
    response = await client.get("/api/dashboard")
    assert response.status_code == 200
    body = response.json()

    assert body["kpis"]["active_orders"] == 5
    assert body["kpis"]["new_orders_today"] == 7
    assert [stage["order_count"] for stage in body["pipeline"]] == [1, 1, 1, 1, 1]
    assert [stage["total_quantity"] for stage in body["pipeline"]] == [
        10,
        20,
        30,
        40,
        50,
    ]
    assert completed.id != cancelled.id


async def test_dashboard_daily_output_and_reject(
    session: AsyncSession,
    users: dict,
    catalog: dict,
) -> None:
    order = await seed_order(
        session,
        catalog,
        code="DSH-LOG",
        status=OrderStatus.CUTTING,
    )
    archived = await seed_order(
        session,
        catalog,
        code="DSH-LOG-ARSIP",
        status=OrderStatus.CUTTING,
    )
    archived.deleted_at = datetime.now(UTC)
    await session.commit()

    await seed_log(
        session,
        order,
        stage=OrderStatus.CUTTING,
        log_date=TODAY,
        output_qty=10,
        reject_qty=2,
    )
    await seed_log(
        session,
        order,
        stage=OrderStatus.JAHIT,
        log_date=TODAY - timedelta(days=1),
        output_qty=20,
        reject_qty=1,
    )
    await seed_log(
        session,
        order,
        stage=OrderStatus.FINISHING,
        log_date=TODAY - timedelta(days=6),
        output_qty=5,
        reject_qty=3,
    )
    await seed_log(
        session,
        order,
        stage=OrderStatus.QC,
        log_date=TODAY - timedelta(days=7),
        output_qty=100,
        reject_qty=50,
    )
    await seed_log(
        session,
        archived,
        stage=OrderStatus.CUTTING,
        log_date=TODAY,
        output_qty=1000,
        reject_qty=1000,
    )

    dashboard = await build_dashboard(session, now=FIXED_NOW)

    assert [item.date for item in dashboard.daily_output] == [
        TODAY - timedelta(days=6) + timedelta(days=index) for index in range(7)
    ]
    assert [item.output_qty for item in dashboard.daily_output] == [
        5,
        0,
        0,
        0,
        0,
        20,
        10,
    ]
    assert dashboard.kpis.today_output == 10
    assert dashboard.kpis.yesterday_output == 20
    assert dashboard.kpis.today_reject == 2
    assert dashboard.kpis.today_reject_ratio == 16.67
    assert [item.reject_qty for item in dashboard.reject_breakdown] == [2, 1, 3, 0]


async def test_dashboard_deadlines_are_sorted_limited_and_filtered(
    session: AsyncSession,
    users: dict,
    catalog: dict,
) -> None:
    deadlines = [
        (TODAY - timedelta(days=4), "DSH-D1"),
        (TODAY - timedelta(days=3), "DSH-D2"),
        (TODAY - timedelta(days=2), "DSH-D3"),
        (TODAY - timedelta(days=1), "DSH-D4"),
        (TODAY, "DSH-D5"),
        (TODAY + timedelta(days=1), "DSH-D6"),
    ]
    for deadline, code in deadlines:
        await seed_order(
            session,
            catalog,
            code=code,
            deadline=deadline,
            customer_id=catalog["customer"].id,
        )

    await seed_order(
        session,
        catalog,
        code="DSH-D-SELESAI",
        status=OrderStatus.SELESAI,
        deadline=TODAY - timedelta(days=10),
    )
    await seed_order(
        session,
        catalog,
        code="DSH-D-BATAL",
        status=OrderStatus.DIBATALKAN,
        deadline=TODAY - timedelta(days=10),
    )
    archived = await seed_order(
        session,
        catalog,
        code="DSH-D-ARSIP",
        deadline=TODAY - timedelta(days=10),
    )
    archived.deleted_at = datetime.now(UTC)
    await session.commit()
    await seed_order(session, catalog, code="DSH-D-TANPA", deadline=None)

    dashboard = await build_dashboard(session, now=FIXED_NOW)

    assert len(dashboard.upcoming_deadlines) == 5
    assert [item.code for item in dashboard.upcoming_deadlines] == [
        "DSH-D1",
        "DSH-D2",
        "DSH-D3",
        "DSH-D4",
        "DSH-D5",
    ]
    assert [item.is_overdue for item in dashboard.upcoming_deadlines] == [
        True,
        True,
        True,
        True,
        False,
    ]
    first = dashboard.upcoming_deadlines[0]
    assert first.customer_name == "Toko Denim Jaya"
    assert first.model_summary == "Jeans Slim Fit"


async def test_dashboard_deadline_priority_breaks_ties(
    session: AsyncSession,
    users: dict,
    catalog: dict,
) -> None:
    await seed_order(
        session,
        catalog,
        code="DSH-P-RENDAH",
        deadline=TODAY + timedelta(days=2),
        priority=Priority.RENDAH,
    )
    await seed_order(
        session,
        catalog,
        code="DSH-P-TINGGI",
        deadline=TODAY + timedelta(days=2),
        priority=Priority.TINGGI,
    )

    dashboard = await build_dashboard(session, now=FIXED_NOW)

    assert [item.code for item in dashboard.upcoming_deadlines] == [
        "DSH-P-TINGGI",
        "DSH-P-RENDAH",
    ]


async def test_dashboard_critical_stock_is_limited_and_sorted(
    session: AsyncSession,
    users: dict,
) -> None:
    await seed_material(
        session,
        sku="DSH-HABIS",
        stock_qty="0",
        minimum_stock="10",
    )
    await seed_material(
        session,
        sku="DSH-KRITIS-2",
        stock_qty="2",
        minimum_stock="10",
    )
    await seed_material(
        session,
        sku="DSH-KRITIS-4",
        stock_qty="4",
        minimum_stock="10",
    )
    await seed_material(
        session,
        sku="DSH-MENIPIS-7",
        stock_qty="7",
        minimum_stock="10",
    )
    await seed_material(
        session,
        sku="DSH-MENIPIS-8",
        stock_qty="8",
        minimum_stock="10",
    )
    await seed_material(
        session,
        sku="DSH-MENIPIS-9",
        stock_qty="9",
        minimum_stock="10",
    )
    await seed_material(
        session,
        sku="DSH-AMAN",
        stock_qty="10",
        minimum_stock="10",
    )
    await seed_material(
        session,
        sku="DSH-NONAKTIF",
        stock_qty="0",
        minimum_stock="10",
        is_active=False,
    )

    dashboard = await build_dashboard(session, now=FIXED_NOW)

    assert [item.sku for item in dashboard.critical_stock] == [
        "DSH-HABIS",
        "DSH-KRITIS-2",
        "DSH-KRITIS-4",
        "DSH-MENIPIS-7",
        "DSH-MENIPIS-8",
    ]
    assert [item.status.value for item in dashboard.critical_stock] == [
        "habis",
        "kritis",
        "kritis",
        "menipis",
        "menipis",
    ]
    assert [item.percent for item in dashboard.critical_stock] == [0, 20, 40, 70, 80]


async def test_dashboard_on_time_delivery(
    session: AsyncSession,
    users: dict,
    catalog: dict,
) -> None:
    on_time = await seed_order(
        session,
        catalog,
        code="DSH-OTD-TEPAT",
        status=OrderStatus.SELESAI,
        deadline=TODAY - timedelta(days=3),
    )
    on_time.completed_at = datetime.combine(
        TODAY - timedelta(days=4),
        datetime.min.time(),
        tzinfo=UTC,
    )
    late = await seed_order(
        session,
        catalog,
        code="DSH-OTD-TELAT",
        status=OrderStatus.SELESAI,
        deadline=TODAY - timedelta(days=3),
    )
    late.completed_at = datetime.combine(
        TODAY - timedelta(days=2),
        datetime.min.time(),
        tzinfo=UTC,
    )
    no_deadline = await seed_order(
        session,
        catalog,
        code="DSH-OTD-TANPA",
        status=OrderStatus.SELESAI,
        deadline=None,
    )
    no_deadline.completed_at = datetime.combine(
        TODAY - timedelta(days=1),
        datetime.min.time(),
        tzinfo=UTC,
    )
    old = await seed_order(
        session,
        catalog,
        code="DSH-OTD-LAMA",
        status=OrderStatus.SELESAI,
        deadline=TODAY - timedelta(days=40),
    )
    old.completed_at = datetime.combine(
        TODAY - timedelta(days=35),
        datetime.min.time(),
        tzinfo=UTC,
    )
    cancelled = await seed_order(
        session,
        catalog,
        code="DSH-OTD-BATAL",
        status=OrderStatus.DIBATALKAN,
        deadline=TODAY - timedelta(days=3),
    )
    archived = await seed_order(
        session,
        catalog,
        code="DSH-OTD-ARSIP",
        status=OrderStatus.SELESAI,
        deadline=TODAY - timedelta(days=3),
    )
    archived.completed_at = datetime.combine(
        TODAY - timedelta(days=4),
        datetime.min.time(),
        tzinfo=UTC,
    )
    archived.deleted_at = datetime.now(UTC)
    await session.commit()

    dashboard = await build_dashboard(session, now=FIXED_NOW)

    assert dashboard.kpis.completed_orders_30d == 2
    assert dashboard.kpis.on_time_orders_30d == 1
    assert dashboard.kpis.on_time_delivery_ratio == 50.0
    assert cancelled.id != archived.id


async def test_dashboard_on_time_delivery_without_completed_orders(
    session: AsyncSession,
    users: dict,
) -> None:
    dashboard = await build_dashboard(session, now=FIXED_NOW)

    assert dashboard.kpis.completed_orders_30d == 0
    assert dashboard.kpis.on_time_orders_30d == 0
    assert dashboard.kpis.on_time_delivery_ratio is None


async def test_dashboard_wib_boundary(
    session: AsyncSession,
    users: dict,
    catalog: dict,
) -> None:
    today_order = await seed_order(
        session,
        catalog,
        code="DSH-WIB-HARI",
        status=OrderStatus.MENUNGGU,
    )
    today_order.created_at = datetime(2026, 11, 4, 17, 30, tzinfo=UTC)
    yesterday_order = await seed_order(
        session,
        catalog,
        code="DSH-WIB-KEMARIN",
        status=OrderStatus.MENUNGGU,
    )
    yesterday_order.created_at = datetime(2026, 11, 4, 16, 30, tzinfo=UTC)

    on_time = await seed_order(
        session,
        catalog,
        code="DSH-WIB-OTD-TEPAT",
        status=OrderStatus.SELESAI,
        deadline=date(2026, 11, 4),
    )
    on_time.created_at = datetime(2026, 11, 1, 10, 0, tzinfo=UTC)
    on_time.completed_at = datetime(2026, 11, 4, 16, 30, tzinfo=UTC)
    late = await seed_order(
        session,
        catalog,
        code="DSH-WIB-OTD-TELAT",
        status=OrderStatus.SELESAI,
        deadline=date(2026, 11, 4),
    )
    late.created_at = datetime(2026, 11, 1, 10, 0, tzinfo=UTC)
    late.completed_at = datetime(2026, 11, 4, 17, 30, tzinfo=UTC)
    await session.commit()

    dashboard = await build_dashboard(session, now=FIXED_NOW)

    assert dashboard.kpis.active_orders == 2
    assert dashboard.kpis.new_orders_today == 1
    assert dashboard.kpis.completed_orders_30d == 2
    assert dashboard.kpis.on_time_orders_30d == 1
    assert dashboard.kpis.on_time_delivery_ratio == 50.0
