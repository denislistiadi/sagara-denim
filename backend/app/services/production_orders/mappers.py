"""Pemetaan model ORM perintah produksi menjadi schema respons."""

from app.models import ProductionOrder
from app.schemas.catalog import CustomerOption, ProductOption
from app.schemas.production_order import (
    OrderStatusHistoryRead,
    ProductionLogRead,
    ProductionOrderDetail,
    ProductionOrderItemRead,
    ProductionOrderListItem,
    WorkflowSummary,
)
from app.schemas.user import UserOption
from app.services.production_metrics import (
    completion_loss_qty,
    current_stage_accounting,
    final_output_qty,
    stage_progress,
)


def model_summary(order: ProductionOrder) -> str:
    """Ringkas nama model pada order untuk kolom tabel dan judul."""

    if not order.items:
        return "Belum ada model"

    first = order.items[0].product.name
    if len(order.items) == 1:
        return first
    return f"{first} +{len(order.items) - 1} model"


def to_list_item(order: ProductionOrder) -> ProductionOrderListItem:
    """Petakan model SQLAlchemy menjadi ringkasan response."""

    return ProductionOrderListItem(
        id=order.id,
        code=order.code,
        customer=(CustomerOption.model_validate(order.customer) if order.customer else None),
        pic=UserOption.model_validate(order.pic) if order.pic else None,
        status=order.status,
        priority=order.priority,
        deadline=order.deadline,
        total_quantity=order.total_quantity,
        item_count=len(order.items),
        model_summary=model_summary(order),
        progress=stage_progress(order),
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


def to_workflow_summary(order: ProductionOrder) -> WorkflowSummary:
    """Ringkas akuntansi tahap berjalan dan hasil final order."""

    accounting = current_stage_accounting(order)
    return WorkflowSummary(
        stage_input=accounting.input_qty,
        stage_output=accounting.output_qty,
        stage_reject=accounting.reject_qty,
        stage_scrap=accounting.scrap_qty,
        stage_accounted=accounting.accounted_qty,
        stage_remaining=accounting.remaining_qty,
        stage_progress=accounting.progress,
        stage_complete=accounting.is_complete,
        final_output=final_output_qty(order),
        final_loss=completion_loss_qty(order),
    )


def to_detail(order: ProductionOrder) -> ProductionOrderDetail:
    """Petakan model SQLAlchemy menjadi detail response."""

    return ProductionOrderDetail(
        **to_list_item(order).model_dump(),
        notes=order.notes,
        started_at=order.started_at,
        completed_at=order.completed_at,
        created_by=(UserOption.model_validate(order.created_by) if order.created_by else None),
        items=[
            ProductionOrderItemRead(
                id=item.id,
                product=ProductOption.model_validate(item.product),
                quantity=item.quantity,
                notes=item.notes,
            )
            for item in order.items
        ],
        status_history=[
            OrderStatusHistoryRead(
                id=history.id,
                from_status=history.from_status,
                to_status=history.to_status,
                changed_by=(
                    UserOption.model_validate(history.changed_by) if history.changed_by else None
                ),
                notes=history.notes,
                created_at=history.created_at,
            )
            for history in order.status_history
        ],
        production_logs=[
            ProductionLogRead(
                id=log.id,
                stage=log.stage,
                log_date=log.log_date,
                output_qty=log.output_qty,
                reject_qty=log.reject_qty,
                scrap_qty=log.scrap_qty,
                notes=log.notes,
                created_by=(UserOption.model_validate(log.created_by) if log.created_by else None),
                created_at=log.created_at,
            )
            for log in order.production_logs
        ],
        workflow_summary=to_workflow_summary(order),
    )
