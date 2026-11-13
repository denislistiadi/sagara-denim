import {
  mdiArchiveOutline,
  mdiArrowLeft,
  mdiArrowRight,
  mdiClipboardTextOutline,
  mdiCloseCircleOutline,
  mdiDotsHorizontal,
  mdiPencilOutline,
} from "@mdi/js";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatNumber } from "@/lib/format";
import {
  canArchiveOrder,
  canCreateLog,
  canEditOrder,
  canReworkOrder,
  getAvailableTransitions,
  getStageLogSummary,
  isTerminalStatus,
  LOGGABLE_STATUSES,
  type WorkflowAction,
} from "@/lib/workflow";
import type { ProductionOrderDetail, UserRole } from "@/types";

interface OrderWorkflowActionsProps {
  order: ProductionOrderDetail;
  role: UserRole | null | undefined;
  onTransition: (action: WorkflowAction) => void;
  onLog: () => void;
  onEdit: () => void;
  onArchive: () => void;
}

export function OrderWorkflowActions({
  order,
  role,
  onTransition,
  onLog,
  onEdit,
  onArchive,
}: OrderWorkflowActionsProps) {
  const actions = getAvailableTransitions(order.status, role).filter(
    (action) => !action.isRework || canReworkOrder(order),
  );
  const primary = actions.find((action) => action.tone === "primary");
  const secondary = actions.filter((action) => action !== primary);
  const showLog = canCreateLog(order, role);
  const showEdit = canEditOrder(order, role);
  const showArchive = canArchiveOrder(order, role);
  const terminal = isTerminalStatus(order.status);
  const stageSummary = getStageLogSummary(order);
  const showStageSummary = LOGGABLE_STATUSES.includes(order.status);
  const needsLog = stageSummary.input > 0 && !stageSummary.hasLog;
  const needsAccounting =
    stageSummary.input > 0 && stageSummary.hasLog && !stageSummary.complete;

  if (!primary && secondary.length === 0 && !showLog && !showEdit && !showArchive) {
    return null;
  }

  return (
    <section className="order-panel workflow-actions-panel">
      <div className="order-panel-head">
        <div>
          <h2>Aksi Produksi</h2>
          <p>
            {terminal
              ? "Perintah sudah berada di status akhir. Arsipkan bila tidak lagi diperlukan."
              : "Jalankan transisi tahap, catat output, atau kelola data perintah."}
          </p>
        </div>
      </div>

      <div className="workflow-actions-body">
        <div className="workflow-actions-primary">
          {primary && (
            <Button onClick={() => onTransition(primary)}>
              <Icon path={mdiArrowRight} size={17} />
              {primary.label}
            </Button>
          )}

          {showLog && (
            <Button variant="secondary" onClick={onLog}>
              <Icon path={mdiClipboardTextOutline} size={17} />
              Catat Log Produksi
            </Button>
          )}

          {secondary.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">
                  <Icon path={mdiDotsHorizontal} size={17} />
                  Aksi Lain
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {secondary.map((action) => (
                  <DropdownMenuItem
                    key={`${action.to}-${action.label}`}
                    danger={action.isCancel}
                    onSelect={() => onTransition(action)}
                  >
                    <Icon
                      path={
                        action.isCancel
                          ? mdiCloseCircleOutline
                          : action.isRework
                            ? mdiArrowLeft
                            : mdiArrowRight
                      }
                      size={17}
                    />
                    {action.label}
                  </DropdownMenuItem>
                ))}
                {(showEdit || showArchive) && <DropdownMenuSeparator />}
                {showEdit && (
                  <DropdownMenuItem onSelect={onEdit}>
                    <Icon path={mdiPencilOutline} size={17} />
                    Ubah Perintah
                  </DropdownMenuItem>
                )}
                {showArchive && (
                  <DropdownMenuItem danger onSelect={onArchive}>
                    <Icon path={mdiArchiveOutline} size={17} />
                    Arsipkan
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {secondary.length === 0 && showEdit && (
            <Button variant="secondary" onClick={onEdit}>
              <Icon path={mdiPencilOutline} size={17} />
              Ubah
            </Button>
          )}

          {secondary.length === 0 && showArchive && (
            <Button variant="danger" onClick={onArchive}>
              <Icon path={mdiArchiveOutline} size={17} />
              Arsipkan
            </Button>
          )}
        </div>

        {showStageSummary && (
          <div className="workflow-log-summary">
            <span>
              Input <strong>{formatNumber(stageSummary.input)}</strong>
            </span>
            <span>
              Output <strong>{formatNumber(stageSummary.output)}</strong>
            </span>
            <span>
              Reject <strong>{formatNumber(stageSummary.reject)}</strong>
            </span>
            <span>
              Scrap <strong>{formatNumber(stageSummary.scrap)}</strong>
            </span>
            <span>
              Sisa <strong>{formatNumber(stageSummary.remaining)}</strong> pcs
            </span>
            {needsLog && (
              <span className="workflow-log-summary-warning">
                Catat minimal satu log sebelum pindah tahap.
              </span>
            )}
            {needsAccounting && (
              <span className="workflow-log-summary-warning">
                Akuntansi tahap belum lengkap:{" "}
                {formatNumber(stageSummary.accounted)} dari{" "}
                {formatNumber(stageSummary.input)} pcs.
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
