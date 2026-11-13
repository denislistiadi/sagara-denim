"""Pengujian transisi status, log produksi, dan guard workflow."""

from __future__ import annotations

from datetime import datetime, timedelta

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import WIB
from app.models import OrderStatus, User
from tests.support import create_payload, login, seed_order


async def _create_order(
    client: AsyncClient,
    catalog: dict,
    *,
    quantity: int = 20,
    priority: str = "normal",
) -> str:
    response = await client.post(
        "/api/production-orders",
        json=create_payload(
            catalog,
            priority=priority,
            items=[
                {
                    "product_id": str(catalog["product"].id),
                    "quantity": quantity,
                }
            ],
        ),
    )
    assert response.status_code == 201
    return response.json()["id"]


async def _transition(
    client: AsyncClient,
    order_id: str,
    expected: str,
    target: str,
    *,
    notes: str | None = None,
):
    payload: dict = {
        "expected_status": expected,
        "to_status": target,
    }
    if notes is not None:
        payload["notes"] = notes
    return await client.patch(
        f"/api/production-orders/{order_id}/status",
        json=payload,
    )


async def _add_log(
    client: AsyncClient,
    order_id: str,
    output_qty: int,
    reject_qty: int = 0,
    scrap_qty: int = 0,
    *,
    log_date: str | None = None,
):
    payload: dict = {
        "output_qty": output_qty,
        "reject_qty": reject_qty,
        "scrap_qty": scrap_qty,
    }
    if log_date is not None:
        payload["log_date"] = log_date
    return await client.post(
        f"/api/production-orders/{order_id}/logs",
        json=payload,
    )


async def _advance_to_qc(
    client: AsyncClient,
    catalog: dict,
    *,
    quantity: int = 20,
) -> str:
    order_id = await _create_order(client, catalog, quantity=quantity)
    assert (await _transition(client, order_id, "menunggu", "cutting")).status_code == 200

    for stage, next_stage in (
        ("cutting", "jahit"),
        ("jahit", "finishing"),
        ("finishing", "qc"),
    ):
        assert (await _add_log(client, order_id, quantity)).status_code == 201
        assert (await _transition(client, order_id, stage, next_stage)).status_code == 200

    return order_id


async def test_operator_forward_flow_and_timestamps(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
) -> None:
    await login(client, "operator")
    order_id = await _create_order(client, catalog, quantity=20)

    started = await _transition(client, order_id, "menunggu", "cutting")
    assert started.status_code == 200
    assert started.json()["status"] == "cutting"
    assert started.json()["started_at"] is not None
    assert started.json()["status_history"][-1]["changed_by"]["id"] == str(users["operator"].id)

    for stage, next_stage, output in (
        ("cutting", "jahit", 20),
        ("jahit", "finishing", 20),
        ("finishing", "qc", 20),
    ):
        logged = await _add_log(client, order_id, output)
        assert logged.status_code == 201
        assert logged.json()["production_logs"][-1]["stage"] == stage
        moved = await _transition(client, order_id, stage, next_stage)
        assert moved.status_code == 200

    before_finish = await client.get(f"/api/production-orders/{order_id}")
    assert before_finish.json()["status"] == "qc"
    assert before_finish.json()["completed_at"] is None
    assert before_finish.json()["progress"] == 0

    forbidden = await _transition(client, order_id, "qc", "selesai")
    assert forbidden.status_code == 403

    await login(client, "qc")
    assert (await _add_log(client, order_id, 20)).status_code == 201

    finished = await _transition(client, order_id, "qc", "selesai")
    assert finished.status_code == 200
    assert finished.json()["status"] == "selesai"
    assert finished.json()["completed_at"] is not None
    assert finished.json()["progress"] == 100
    assert [event["to_status"] for event in finished.json()["status_history"]] == [
        "menunggu",
        "cutting",
        "jahit",
        "finishing",
        "qc",
        "selesai",
    ]


async def test_transition_requires_current_stage_log(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
) -> None:
    await login(client, "operator")
    order_id = await _create_order(client, catalog)
    assert (await _transition(client, order_id, "menunggu", "cutting")).status_code == 200

    blocked = await _transition(client, order_id, "cutting", "jahit")
    assert blocked.status_code == 409
    assert "Catat minimal satu log tahap Cutting" in blocked.json()["detail"]

    assert (await _add_log(client, order_id, 20)).status_code == 201
    assert (await _transition(client, order_id, "cutting", "jahit")).status_code == 200


async def test_invalid_and_stale_transitions(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
) -> None:
    await login(client, "operator")
    order_id = await _create_order(client, catalog)

    invalid = await _transition(client, order_id, "menunggu", "jahit")
    assert invalid.status_code == 409
    assert "tidak diizinkan" in invalid.json()["detail"]

    assert (await _transition(client, order_id, "menunggu", "cutting")).status_code == 200
    stale = await _transition(client, order_id, "menunggu", "cutting")
    assert stale.status_code == 409
    assert stale.json()["detail"] == "Status perintah sudah berubah. Muat ulang data."


async def test_qc_rework_requires_notes_and_log(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
) -> None:
    await login(client, "operator")
    order_id = await _advance_to_qc(client, catalog, quantity=20)

    await login(client, "qc")
    missing_log = await _transition(client, order_id, "qc", "jahit", notes="Rework")
    assert missing_log.status_code == 409
    assert "log tahap QC" in missing_log.json()["detail"]

    assert (await _add_log(client, order_id, 10, 10)).status_code == 201

    missing_notes = await _transition(client, order_id, "qc", "jahit")
    assert missing_notes.status_code == 422
    assert "Alasan wajib diisi" in missing_notes.json()["detail"]

    reworked = await _transition(client, order_id, "qc", "jahit", notes="Jahitan miring.")
    assert reworked.status_code == 200
    assert reworked.json()["status"] == "jahit"
    assert reworked.json()["status_history"][-1]["notes"] == "Jahitan miring."

    reset = await client.get(f"/api/production-orders/{order_id}")
    assert reset.json()["progress"] == 0
    assert reset.json()["workflow_summary"]["stage_input"] == 10

    await login(client, "operator")
    assert (await _add_log(client, order_id, 5)).status_code == 201
    progressed = await client.get(f"/api/production-orders/{order_id}")
    assert progressed.json()["progress"] == 50


async def test_qc_can_rework_to_finishing(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
) -> None:
    await login(client, "operator")
    order_id = await _advance_to_qc(client, catalog, quantity=20)

    await login(client, "qc")
    assert (await _add_log(client, order_id, 10, 10)).status_code == 201
    reworked = await _transition(
        client,
        order_id,
        "qc",
        "finishing",
        notes="Perbaikan finishing.",
    )
    assert reworked.status_code == 200
    assert reworked.json()["status"] == "finishing"
    assert reworked.json()["workflow_summary"]["stage_input"] == 10


async def test_cancel_rules(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
) -> None:
    await login(client, "operator")
    waiting_id = await _create_order(client, catalog)

    missing_reason = await _transition(client, waiting_id, "menunggu", "dibatalkan")
    assert missing_reason.status_code == 422

    cancelled = await _transition(
        client,
        waiting_id,
        "menunggu",
        "dibatalkan",
        notes="Salah input.",
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "dibatalkan"

    active_id = await _create_order(client, catalog)
    assert (await _transition(client, active_id, "menunggu", "cutting")).status_code == 200
    forbidden = await _transition(
        client,
        active_id,
        "cutting",
        "dibatalkan",
        notes="Batal.",
    )
    assert forbidden.status_code == 403

    await login(client, "admin")
    admin_cancel = await _transition(
        client,
        active_id,
        "cutting",
        "dibatalkan",
        notes="Batal oleh admin.",
    )
    assert admin_cancel.status_code == 200


async def test_transition_role_matrix(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
) -> None:
    await login(client, "operator")
    order_id = await _create_order(client, catalog)
    assert (await _transition(client, order_id, "menunggu", "cutting")).status_code == 200
    assert (await _add_log(client, order_id, 20)).status_code == 201
    assert (await _transition(client, order_id, "cutting", "jahit")).status_code == 200

    await login(client, "qc")
    forbidden = await _transition(client, order_id, "jahit", "finishing")
    assert forbidden.status_code == 403
    assert forbidden.json()["detail"] == "Anda tidak memiliki akses untuk aksi ini."


async def test_log_validation(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
) -> None:
    await login(client, "operator")
    order_id = await _create_order(client, catalog, quantity=20)
    assert (await _transition(client, order_id, "menunggu", "cutting")).status_code == 200

    zero = await _add_log(client, order_id, 0, 0)
    assert zero.status_code == 422

    tomorrow = (datetime.now(WIB).date() + timedelta(days=1)).isoformat()
    future = await _add_log(client, order_id, 5, log_date=tomorrow)
    assert future.status_code == 422
    assert "melewati hari ini" in future.json()["detail"]

    over = await _add_log(client, order_id, 21)
    assert over.status_code == 422
    assert "melebihi sisa" in over.json()["detail"]

    reject_here = await _add_log(client, order_id, 5, 3)
    assert reject_here.status_code == 422
    assert "Reject hanya dapat dicatat pada tahap QC" in reject_here.json()["detail"]

    first = await _add_log(client, order_id, 5, 0, 1)
    assert first.status_code == 201
    assert first.json()["production_logs"][-1]["created_by"]["id"] == str(users["operator"].id)
    assert first.json()["production_logs"][-1]["scrap_qty"] == 1
    assert first.json()["progress"] == 25

    second = await _add_log(client, order_id, 14)
    assert second.status_code == 201
    assert second.json()["progress"] == 95

    over_cycle = await _add_log(client, order_id, 1)
    assert over_cycle.status_code == 422


async def test_transition_requires_full_stage_accounting(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
) -> None:
    await login(client, "operator")
    order_id = await _create_order(client, catalog, quantity=20)
    assert (await _transition(client, order_id, "menunggu", "cutting")).status_code == 200

    assert (await _add_log(client, order_id, 5)).status_code == 201

    blocked = await _transition(client, order_id, "cutting", "jahit")
    assert blocked.status_code == 409
    assert "Akuntansi tahap Cutting belum lengkap" in blocked.json()["detail"]
    assert "5 dari 20 pcs" in blocked.json()["detail"]

    assert (await _add_log(client, order_id, 0, 0, 15)).status_code == 201
    moved = await _transition(client, order_id, "cutting", "jahit")
    assert moved.status_code == 200
    assert moved.json()["workflow_summary"]["stage_input"] == 5


async def test_scrap_is_final_and_zero_input_stages_can_advance(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
) -> None:
    await login(client, "admin")
    order_id = await _create_order(client, catalog, quantity=10)
    assert (await _transition(client, order_id, "menunggu", "cutting")).status_code == 200

    assert (await _add_log(client, order_id, 0, 0, 10)).status_code == 201
    assert (await _transition(client, order_id, "cutting", "jahit")).status_code == 200

    at_jahit = await client.get(f"/api/production-orders/{order_id}")
    summary = at_jahit.json()["workflow_summary"]
    assert summary["stage_input"] == 0
    assert summary["stage_complete"] is False
    assert summary["final_output"] == 0

    no_log_needed = await _transition(client, order_id, "jahit", "finishing")
    assert no_log_needed.status_code == 200

    blocked_log = await _add_log(client, order_id, 1)
    assert blocked_log.status_code == 409
    assert "tidak memiliki input" in blocked_log.json()["detail"]

    assert (await _transition(client, order_id, "finishing", "qc")).status_code == 200
    cannot_complete = await _transition(client, order_id, "qc", "selesai")
    assert cannot_complete.status_code == 409
    assert "Output final masih nol" in cannot_complete.json()["detail"]


async def test_completion_reconciles_loss_and_requires_reason(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
) -> None:
    await login(client, "operator")
    order_id = await _advance_to_qc(client, catalog, quantity=20)

    await login(client, "qc")
    assert (await _add_log(client, order_id, 15, 5)).status_code == 201

    detail = await client.get(f"/api/production-orders/{order_id}")
    summary = detail.json()["workflow_summary"]
    assert summary["final_output"] == 15
    assert summary["final_loss"] == 5

    missing_reason = await _transition(client, order_id, "qc", "selesai")
    assert missing_reason.status_code == 422
    assert "kehilangan 5 pcs" in missing_reason.json()["detail"]

    finished = await _transition(
        client,
        order_id,
        "qc",
        "selesai",
        notes="5 pcs reject tidak dapat diperbaiki.",
    )
    assert finished.status_code == 200
    assert finished.json()["status"] == "selesai"
    assert finished.json()["workflow_summary"]["final_loss"] == 5


async def test_log_role_and_stage_rules(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
) -> None:
    await login(client, "operator")
    order_id = await _create_order(client, catalog)
    assert (await _transition(client, order_id, "menunggu", "cutting")).status_code == 200

    await login(client, "qc")
    forbidden = await _add_log(client, order_id, 5)
    assert forbidden.status_code == 403

    await login(client, "admin")
    assert (await _add_log(client, order_id, 20)).status_code == 201

    cancelled_id = await _create_order(client, catalog)
    assert (
        await _transition(
            client,
            cancelled_id,
            "menunggu",
            "dibatalkan",
            notes="Batal.",
        )
    ).status_code == 200
    terminal = await _add_log(client, cancelled_id, 5)
    assert terminal.status_code == 409


async def test_update_and_archive_guards(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
) -> None:
    await login(client, "operator")
    order_id = await _create_order(client, catalog)

    header_while_waiting = await client.patch(
        f"/api/production-orders/{order_id}",
        json={"priority": "tinggi"},
    )
    assert header_while_waiting.status_code == 200

    items_while_waiting = await client.patch(
        f"/api/production-orders/{order_id}",
        json={
            "items": [
                {
                    "product_id": str(catalog["second_product"].id),
                    "quantity": 15,
                }
            ]
        },
    )
    assert items_while_waiting.status_code == 200

    assert (await _transition(client, order_id, "menunggu", "cutting")).status_code == 200

    header_while_active = await client.patch(
        f"/api/production-orders/{order_id}",
        json={"deadline": "2026-12-01"},
    )
    assert header_while_active.status_code == 200

    items_while_active = await client.patch(
        f"/api/production-orders/{order_id}",
        json={
            "items": [
                {
                    "product_id": str(catalog["product"].id),
                    "quantity": 10,
                }
            ]
        },
    )
    assert items_while_active.status_code == 409

    archive_active = await client.delete(f"/api/production-orders/{order_id}")
    assert archive_active.status_code == 403

    await login(client, "admin")
    archive_active_admin = await client.delete(f"/api/production-orders/{order_id}")
    assert archive_active_admin.status_code == 409

    cancelled = await _transition(
        client,
        order_id,
        "cutting",
        "dibatalkan",
        notes="Batal.",
    )
    assert cancelled.status_code == 200

    terminal_update = await client.patch(
        f"/api/production-orders/{order_id}",
        json={"priority": "rendah"},
    )
    assert terminal_update.status_code == 409

    archived = await client.delete(f"/api/production-orders/{order_id}")
    assert archived.status_code == 200


async def test_archived_order_cannot_transition_or_log(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
    session: AsyncSession,
) -> None:
    await login(client, "admin")
    order = await seed_order(
        session,
        catalog,
        code="PRD-2612-900",
        status=OrderStatus.SELESAI,
        quantity=20,
        customer_id=catalog["customer"].id,
        pic_id=users["admin"].id,
    )
    assert (await client.delete(f"/api/production-orders/{order.id}")).status_code == 200

    transition = await _transition(client, str(order.id), "selesai", "dibatalkan")
    assert transition.status_code == 404

    log = await _add_log(client, str(order.id), 1)
    assert log.status_code == 404


async def test_new_endpoints_require_authentication(
    client: AsyncClient,
    catalog: dict,
) -> None:
    queue = await client.get("/api/production-orders/queue")
    assert queue.status_code == 401

    status_update = await client.patch(
        "/api/production-orders/00000000-0000-0000-0000-000000000000/status",
        json={"expected_status": "menunggu", "to_status": "cutting"},
    )
    assert status_update.status_code == 401

    log = await client.post(
        "/api/production-orders/00000000-0000-0000-0000-000000000000/logs",
        json={"output_qty": 1, "reject_qty": 0},
    )
    assert log.status_code == 401
