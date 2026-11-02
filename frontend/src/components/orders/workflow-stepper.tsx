import { mdiCheck } from "@mdi/js";
import { Icon } from "@/components/icon";
import { ORDER_STATUS_LABELS } from "@/lib/labels";
import { getStatusStepIndex } from "@/lib/workflow";
import type { OrderStatus, ProductionOrderDetail } from "@/types";

const STEP_STATUSES: OrderStatus[] = [
  "menunggu",
  "cutting",
  "jahit",
  "finishing",
  "qc",
  "selesai",
];

type StepState = "done" | "active" | "cancelled" | "upcoming";

export function WorkflowStepper({ order }: { order: ProductionOrderDetail }) {
  const cancelled = order.status === "dibatalkan";
  const currentIndex = getStatusStepIndex(order.status);
  const cancelEntry = cancelled
    ? [...order.status_history]
        .reverse()
        .find((entry) => entry.to_status === "dibatalkan")
    : undefined;
  const cancelledIndex = cancelEntry?.from_status
    ? getStatusStepIndex(cancelEntry.from_status)
    : -1;

  function stepState(index: number): StepState {
    if (cancelled) {
      if (cancelledIndex >= 0 && index < cancelledIndex) {
        return "done";
      }
      if (index === cancelledIndex) {
        return "cancelled";
      }
      return "upcoming";
    }

    if (index < currentIndex) {
      return "done";
    }
    if (index === currentIndex) {
      return "active";
    }
    return "upcoming";
  }

  return (
    <section className="order-panel workflow-panel">
      <div className="order-panel-head">
        <div>
          <h2>Alur Produksi</h2>
          <p>Posisi perintah pada tahapan produksi saat ini.</p>
        </div>
      </div>

      {cancelled && (
        <div className="workflow-cancelled-note" role="status">
          <span className="workflow-cancelled-dot" aria-hidden="true" />
          <span>
            Alur produksi dihentikan. Perintah dibatalkan
            {cancelEntry?.from_status
              ? ` saat berada di tahap ${ORDER_STATUS_LABELS[cancelEntry.from_status]}.`
              : "."}
          </span>
        </div>
      )}

      <ol
        className="workflow-stepper"
        aria-label="Alur produksi"
        data-cancelled={cancelled || undefined}
      >
        {STEP_STATUSES.map((status, index) => {
          const state = stepState(index);

          return (
            <li
              className={`workflow-step workflow-step-${state}`}
              key={status}
              aria-current={state === "active" ? "step" : undefined}
            >
              <span className="workflow-step-marker" aria-hidden="true">
                {state === "done" ? (
                  <Icon path={mdiCheck} size={16} />
                ) : (
                  index + 1
                )}
              </span>
              <span className="workflow-step-label">
                {ORDER_STATUS_LABELS[status]}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
