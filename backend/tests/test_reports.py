"""Pengujian laporan produksi dan export CSV."""

import csv
import io
from datetime import UTC, date, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import OrderStatus
from tests.support import login, seed_log, seed_order

START = date(2026, 10, 1)
END = date(2026, 10, 31)

CSV_HEADER = [
    "Tanggal Log",
    "Kode Order",
    "Pelanggan",
    "Tahap",
    "Output",
    "Reject",
    "Rasio Reject (%)",
    "Status Order",
    "Order Diarsipkan",
    "Catatan",
    "Dicatat Oleh",
    "Waktu Input (WIB)",
]


def report_params(
    *,
    start: date = START,
    end: date = END,
    stage: str | None = None,
    order_id: str | None = None,
    page: int | None = None,
    page_size: int | None = None,
) -> dict[str, str | int]:
    """Bangun query string laporan untuk pengujian."""

    params: dict[str, str | int] = {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
    }
    if stage is not None:
        params["stage"] = stage
    if order_id is not None:
        params["order_id"] = order_id
    if page is not None:
        params["page"] = page
    if page_size is not None:
        params["page_size"] = page_size
    return params


def export_params(
    *,
    start: date = START,
    end: date = END,
    stage: str | None = None,
    order_id: str | None = None,
) -> dict[str, str]:
    """Bangun query string export untuk pengujian."""

    params: dict[str, str] = {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
    }
    if stage is not None:
        params["stage"] = stage
    if order_id is not None:
        params["order_id"] = order_id
    return params


def parse_csv(content: bytes) -> list[list[str]]:
    """Urai CSV laporan memakai delimiter dan encoding yang disepakati."""

    text = content.decode("utf-8-sig")
    return list(csv.reader(io.StringIO(text), delimiter=";"))


async def test_report_summary_and_ratio(
    client: AsyncClient,
    session: AsyncSession,
    users: dict,
    catalog: dict,
) -> None:
    first = await seed_order(
        session,
        catalog,
        code="PRD-001",
        customer_id=catalog["customer"].id,
    )
    second = await seed_order(
        session,
        catalog,
        code="PRD-002",
        customer_id=catalog["second_customer"].id,
    )
    await seed_log(
        session,
        first,
        stage=OrderStatus.CUTTING,
        log_date=date(2026, 10, 1),
        output_qty=100,
        reject_qty=5,
        created_by_id=users["operator"].id,
    )
    await seed_log(
        session,
        first,
        stage=OrderStatus.JAHIT,
        log_date=date(2026, 10, 2),
        output_qty=80,
        reject_qty=2,
        created_by_id=users["operator"].id,
    )
    await seed_log(
        session,
        second,
        stage=OrderStatus.FINISHING,
        log_date=date(2026, 10, 2),
        output_qty=50,
        reject_qty=1,
        created_by_id=users["qc"].id,
    )
    await seed_log(
        session,
        second,
        stage=OrderStatus.QC,
        log_date=date(2026, 10, 3),
        output_qty=40,
        reject_qty=2,
        created_by_id=users["qc"].id,
    )

    await login(client)
    response = await client.get("/api/reports/production", params=report_params())

    assert response.status_code == 200
    summary = response.json()["summary"]
    assert summary == {
        "total_output": 270,
        "total_reject": 10,
        "reject_ratio": 3.57,
        "orders_logged": 2,
        "logs_count": 4,
        "days_count": 3,
    }


async def test_report_date_range_is_inclusive(
    client: AsyncClient,
    session: AsyncSession,
    users: dict,
    catalog: dict,
) -> None:
    order = await seed_order(session, catalog, code="PRD-001")
    for log_date, output_qty in (
        (date(2026, 9, 30), 10),
        (date(2026, 10, 1), 20),
        (date(2026, 10, 31), 30),
        (date(2026, 11, 1), 40),
    ):
        await seed_log(
            session,
            order,
            stage=OrderStatus.CUTTING,
            log_date=log_date,
            output_qty=output_qty,
            reject_qty=0,
        )

    await login(client)
    response = await client.get("/api/reports/production", params=report_params())

    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["total_output"] == 50
    assert data["summary"]["logs_count"] == 2
    assert [item["date"] for item in data["daily"]] == ["2026-10-01", "2026-10-31"]
    assert [item["output_qty"] for item in data["daily"]] == [20, 30]


async def test_report_stage_filter(
    client: AsyncClient,
    session: AsyncSession,
    users: dict,
    catalog: dict,
) -> None:
    order = await seed_order(session, catalog, code="PRD-001")
    for stage, output_qty, reject_qty in (
        (OrderStatus.CUTTING, 100, 5),
        (OrderStatus.JAHIT, 80, 2),
        (OrderStatus.FINISHING, 50, 1),
        (OrderStatus.QC, 40, 2),
    ):
        await seed_log(
            session,
            order,
            stage=stage,
            log_date=date(2026, 10, 1),
            output_qty=output_qty,
            reject_qty=reject_qty,
        )

    await login(client)
    response = await client.get(
        "/api/reports/production",
        params=report_params(stage="jahit"),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["summary"] == {
        "total_output": 80,
        "total_reject": 2,
        "reject_ratio": 2.44,
        "orders_logged": 1,
        "logs_count": 1,
        "days_count": 1,
    }
    assert data["daily"] == [
        {
            "date": "2026-10-01",
            "output_qty": 80,
            "reject_qty": 2,
            "reject_ratio": 2.44,
            "logs_count": 1,
        }
    ]
    stages = {item["stage"]: item for item in data["stages"]}
    assert stages["jahit"]["output_qty"] == 80
    assert stages["jahit"]["logs_count"] == 1
    assert stages["cutting"]["output_qty"] == 0
    assert stages["finishing"]["output_qty"] == 0
    assert stages["qc"]["output_qty"] == 0
    assert [item["stage"] for item in data["logs"]["items"]] == ["jahit"]


async def test_report_order_filter(
    client: AsyncClient,
    session: AsyncSession,
    users: dict,
    catalog: dict,
) -> None:
    first = await seed_order(session, catalog, code="PRD-001")
    second = await seed_order(session, catalog, code="PRD-002")
    await seed_log(
        session,
        first,
        stage=OrderStatus.CUTTING,
        log_date=date(2026, 10, 1),
        output_qty=100,
        reject_qty=5,
    )
    await seed_log(
        session,
        second,
        stage=OrderStatus.JAHIT,
        log_date=date(2026, 10, 2),
        output_qty=80,
        reject_qty=2,
    )

    await login(client)
    response = await client.get(
        "/api/reports/production",
        params=report_params(order_id=str(first.id)),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["filters"]["order_id"] == str(first.id)
    assert data["summary"]["total_output"] == 100
    assert data["summary"]["logs_count"] == 1
    assert [item["order_code"] for item in data["logs"]["items"]] == ["PRD-001"]
    assert {item["stage"] for item in data["logs"]["items"]} == {"cutting"}


async def test_report_daily_breakdown(
    client: AsyncClient,
    session: AsyncSession,
    users: dict,
    catalog: dict,
) -> None:
    order = await seed_order(session, catalog, code="PRD-001")
    await seed_log(
        session,
        order,
        stage=OrderStatus.CUTTING,
        log_date=date(2026, 10, 3),
        output_qty=30,
        reject_qty=3,
    )
    await seed_log(
        session,
        order,
        stage=OrderStatus.JAHIT,
        log_date=date(2026, 10, 1),
        output_qty=10,
        reject_qty=1,
    )
    await seed_log(
        session,
        order,
        stage=OrderStatus.JAHIT,
        log_date=date(2026, 10, 1),
        output_qty=20,
        reject_qty=1,
    )

    await login(client)
    response = await client.get("/api/reports/production", params=report_params())

    assert response.status_code == 200
    daily = response.json()["daily"]
    assert [item["date"] for item in daily] == ["2026-10-01", "2026-10-03"]
    assert daily[0] == {
        "date": "2026-10-01",
        "output_qty": 30,
        "reject_qty": 2,
        "reject_ratio": 6.25,
        "logs_count": 2,
    }
    assert daily[1] == {
        "date": "2026-10-03",
        "output_qty": 30,
        "reject_qty": 3,
        "reject_ratio": 9.09,
        "logs_count": 1,
    }


async def test_report_stage_breakdown_zero_fill(
    client: AsyncClient,
    session: AsyncSession,
    users: dict,
    catalog: dict,
) -> None:
    order = await seed_order(session, catalog, code="PRD-001")
    await seed_log(
        session,
        order,
        stage=OrderStatus.CUTTING,
        log_date=date(2026, 10, 1),
        output_qty=50,
        reject_qty=1,
    )
    await seed_log(
        session,
        order,
        stage=OrderStatus.QC,
        log_date=date(2026, 10, 2),
        output_qty=40,
        reject_qty=2,
    )

    await login(client)
    response = await client.get("/api/reports/production", params=report_params())

    assert response.status_code == 200
    stages = response.json()["stages"]
    assert [item["stage"] for item in stages] == ["cutting", "jahit", "finishing", "qc"]
    assert stages[0]["output_qty"] == 50
    assert stages[1] == {
        "stage": "jahit",
        "output_qty": 0,
        "reject_qty": 0,
        "reject_ratio": 0.0,
        "logs_count": 0,
    }
    assert stages[2]["output_qty"] == 0
    assert stages[3]["output_qty"] == 40


async def test_report_pagination_and_ordering(
    client: AsyncClient,
    session: AsyncSession,
    users: dict,
    catalog: dict,
) -> None:
    order = await seed_order(session, catalog, code="PRD-001")
    for index in range(25):
        await seed_log(
            session,
            order,
            stage=OrderStatus.CUTTING,
            log_date=date(2026, 10, 1) + timedelta(days=index),
            output_qty=index + 1,
            reject_qty=0,
            created_at=datetime(2026, 10, 1, 8, 0, tzinfo=UTC)
            + timedelta(minutes=index),
        )

    await login(client)
    first_page = await client.get(
        "/api/reports/production",
        params=report_params(page=1, page_size=20),
    )
    second_page = await client.get(
        "/api/reports/production",
        params=report_params(page=2, page_size=20),
    )

    assert first_page.status_code == 200
    assert second_page.status_code == 200
    first_data = first_page.json()
    second_data = second_page.json()
    assert first_data["logs"]["total"] == 25
    assert first_data["logs"]["total_pages"] == 2
    assert len(first_data["logs"]["items"]) == 20
    assert len(second_data["logs"]["items"]) == 5
    assert first_data["logs"]["items"][0]["log_date"] == "2026-10-25"
    assert first_data["logs"]["items"][-1]["log_date"] == "2026-10-06"
    assert [item["log_date"] for item in second_data["logs"]["items"]] == [
        "2026-10-05",
        "2026-10-04",
        "2026-10-03",
        "2026-10-02",
        "2026-10-01",
    ]


async def test_report_includes_archived_order(
    client: AsyncClient,
    session: AsyncSession,
    users: dict,
    catalog: dict,
) -> None:
    order = await seed_order(
        session,
        catalog,
        code="PRD-001",
        customer_id=catalog["customer"].id,
    )
    await seed_log(
        session,
        order,
        stage=OrderStatus.CUTTING,
        log_date=date(2026, 10, 1),
        output_qty=25,
        reject_qty=1,
    )
    order.deleted_at = datetime.now(UTC)
    await session.commit()

    await login(client)
    response = await client.get("/api/reports/production", params=report_params())

    assert response.status_code == 200
    item = response.json()["logs"]["items"][0]
    assert item["order_archived"] is True
    assert item["order_code"] == "PRD-001"

    export = await client.get(
        "/api/reports/production/export",
        params=export_params(),
    )
    rows = parse_csv(export.content)
    assert rows[1][8] == "Ya"


async def test_report_includes_cancelled_order(
    client: AsyncClient,
    session: AsyncSession,
    users: dict,
    catalog: dict,
) -> None:
    order = await seed_order(
        session,
        catalog,
        code="PRD-001",
        status=OrderStatus.DIBATALKAN,
    )
    await seed_log(
        session,
        order,
        stage=OrderStatus.CUTTING,
        log_date=date(2026, 10, 1),
        output_qty=15,
        reject_qty=0,
    )

    await login(client)
    response = await client.get("/api/reports/production", params=report_params())

    assert response.status_code == 200
    item = response.json()["logs"]["items"][0]
    assert item["order_status"] == "dibatalkan"
    assert item["order_archived"] is False


async def test_report_empty_range(client: AsyncClient, users: dict) -> None:
    await login(client)
    response = await client.get("/api/reports/production", params=report_params())

    assert response.status_code == 200
    data = response.json()
    assert data["summary"] == {
        "total_output": 0,
        "total_reject": 0,
        "reject_ratio": 0.0,
        "orders_logged": 0,
        "logs_count": 0,
        "days_count": 0,
    }
    assert data["daily"] == []
    assert len(data["stages"]) == 4
    assert all(item["output_qty"] == 0 for item in data["stages"])
    assert data["logs"]["items"] == []
    assert data["logs"]["total"] == 0
    assert data["logs"]["total_pages"] == 0


async def test_report_rejects_invalid_range(
    client: AsyncClient,
    users: dict,
) -> None:
    await login(client)
    response = await client.get(
        "/api/reports/production",
        params=report_params(start=date(2026, 10, 31), end=date(2026, 10, 1)),
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Tanggal awal tidak boleh melebihi tanggal akhir."


async def test_report_rejects_invalid_stage(
    client: AsyncClient,
    users: dict,
) -> None:
    await login(client)
    response = await client.get(
        "/api/reports/production",
        params=report_params(stage="menunggu"),
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    "pagination",
    [{"page": 0}, {"page_size": 101}],
)
async def test_report_rejects_invalid_pagination(
    client: AsyncClient,
    users: dict,
    pagination: dict,
) -> None:
    await login(client)
    response = await client.get(
        "/api/reports/production",
        params=report_params(**pagination),
    )

    assert response.status_code == 422


async def test_report_requires_auth(client: AsyncClient) -> None:
    response = await client.get("/api/reports/production", params=report_params())

    assert response.status_code == 401


async def test_report_all_roles_can_read(
    client: AsyncClient,
    users: dict,
) -> None:
    for role in ("admin", "operator", "qc"):
        await login(client, role)
        response = await client.get(
            "/api/reports/production",
            params=report_params(),
        )
        assert response.status_code == 200


async def test_export_csv_headers_and_rows(
    client: AsyncClient,
    session: AsyncSession,
    users: dict,
    catalog: dict,
) -> None:
    order = await seed_order(
        session,
        catalog,
        code="PRD-001",
        customer_id=catalog["customer"].id,
    )
    await seed_log(
        session,
        order,
        stage=OrderStatus.CUTTING,
        log_date=date(2026, 10, 2),
        output_qty=100,
        reject_qty=5,
        notes="Potong kain.",
        created_by_id=users["operator"].id,
    )
    await seed_log(
        session,
        order,
        stage=OrderStatus.JAHIT,
        log_date=date(2026, 10, 1),
        output_qty=80,
        reject_qty=2,
        notes="Jahit badan.",
        created_by_id=users["operator"].id,
    )

    await login(client)
    response = await client.get(
        "/api/reports/production/export",
        params=export_params(),
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert response.headers["content-disposition"] == (
        'attachment; filename="laporan-produksi-2026-10-01_2026-10-31.csv"'
    )
    assert response.content.startswith(b"\xef\xbb\xbf")

    rows = parse_csv(response.content)
    assert rows[0] == CSV_HEADER
    assert len(rows) == 3
    assert all(len(row) == 12 for row in rows)
    assert rows[1][0] == "2026-10-02"
    assert rows[1][1] == "PRD-001"
    assert rows[1][2] == "Toko Denim Jaya"
    assert rows[1][3] == "Cutting"
    assert rows[1][4] == "100"
    assert rows[1][5] == "5"
    assert rows[1][6] == "4,76"
    assert rows[1][7] == "Menunggu"
    assert rows[1][8] == "Tidak"
    assert rows[1][9] == "Potong kain."
    assert rows[1][10] == "Raka Pratama"
    assert rows[2][0] == "2026-10-01"


async def test_export_csv_respects_filters(
    client: AsyncClient,
    session: AsyncSession,
    users: dict,
    catalog: dict,
) -> None:
    order = await seed_order(session, catalog, code="PRD-001")
    for index in range(25):
        await seed_log(
            session,
            order,
            stage=OrderStatus.CUTTING if index < 15 else OrderStatus.JAHIT,
            log_date=date(2026, 10, 1) + timedelta(days=index),
            output_qty=10,
            reject_qty=1,
        )

    await login(client)
    all_rows = parse_csv(
        (
            await client.get(
                "/api/reports/production/export",
                params=export_params(),
            )
        ).content
    )
    cutting_rows = parse_csv(
        (
            await client.get(
                "/api/reports/production/export",
                params=export_params(stage="cutting"),
            )
        ).content
    )

    assert len(all_rows) == 26
    assert len(cutting_rows) == 16
    assert {row[3] for row in cutting_rows[1:]} == {"Cutting"}


async def test_export_csv_order_filter(
    client: AsyncClient,
    session: AsyncSession,
    users: dict,
    catalog: dict,
) -> None:
    first = await seed_order(session, catalog, code="PRD-001")
    second = await seed_order(session, catalog, code="PRD-002")
    await seed_log(
        session,
        first,
        stage=OrderStatus.CUTTING,
        log_date=date(2026, 10, 1),
        output_qty=100,
        reject_qty=5,
    )
    await seed_log(
        session,
        second,
        stage=OrderStatus.JAHIT,
        log_date=date(2026, 10, 2),
        output_qty=80,
        reject_qty=2,
    )

    await login(client)
    response = await client.get(
        "/api/reports/production/export",
        params=export_params(order_id=str(first.id)),
    )

    assert response.status_code == 200
    rows = parse_csv(response.content)
    assert len(rows) == 2
    assert {row[1] for row in rows[1:]} == {"PRD-001"}


async def test_export_csv_escapes_and_sanitizes(
    client: AsyncClient,
    session: AsyncSession,
    users: dict,
    catalog: dict,
) -> None:
    order = await seed_order(session, catalog, code="PRD-001")
    note = '=SUM(A1;A2)\n"kutip";lanjutan'
    await seed_log(
        session,
        order,
        stage=OrderStatus.CUTTING,
        log_date=date(2026, 10, 1),
        output_qty=10,
        reject_qty=1,
        notes=note,
    )

    await login(client)
    response = await client.get(
        "/api/reports/production/export",
        params=export_params(),
    )

    assert response.status_code == 200
    text = response.content.decode("utf-8-sig")
    assert '"\'=SUM(A1;A2)' in text
    assert '""kutip""' in text
    rows = parse_csv(response.content)
    assert len(rows) == 2
    assert rows[1][9] == f"'{note}"


async def test_export_csv_empty(
    client: AsyncClient,
    users: dict,
) -> None:
    await login(client)
    response = await client.get(
        "/api/reports/production/export",
        params=export_params(),
    )

    assert response.status_code == 200
    assert response.content.startswith(b"\xef\xbb\xbf")
    rows = parse_csv(response.content)
    assert rows == [CSV_HEADER]


async def test_export_csv_all_roles(
    client: AsyncClient,
    users: dict,
) -> None:
    for role in ("admin", "operator", "qc"):
        await login(client, role)
        response = await client.get(
            "/api/reports/production/export",
            params=export_params(),
        )
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/csv")


async def test_export_csv_requires_auth(client: AsyncClient) -> None:
    response = await client.get(
        "/api/reports/production/export",
        params=export_params(),
    )

    assert response.status_code == 401
