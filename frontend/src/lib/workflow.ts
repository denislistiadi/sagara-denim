import type {
  OrderStatus,
  ProductionOrderDetail,
  UserRole,
} from "@/types";

export const ACTIVE_STATUSES: OrderStatus[] = [
  "menunggu",
  "cutting",
  "jahit",
  "finishing",
  "qc",
];

export const TERMINAL_STATUSES: OrderStatus[] = ["selesai", "dibatalkan"];

export const LOGGABLE_STATUSES: OrderStatus[] = [
  "cutting",
  "jahit",
  "finishing",
  "qc",
];

const STEP_STATUSES: OrderStatus[] = [
  "menunggu",
  "cutting",
  "jahit",
  "finishing",
  "qc",
  "selesai",
];

const FORWARD_ROLES: UserRole[] = ["admin", "operator"];
const QC_ROLES: UserRole[] = ["admin", "qc"];

export interface WorkflowAction {
  to: OrderStatus;
  label: string;
  tone: "primary" | "secondary" | "danger";
  requiresNotes: boolean;
  isCancel: boolean;
  isRework: boolean;
}

export interface StageLogSummary {
  input: number;
  output: number;
  reject: number;
  scrap: number;
  accounted: number;
  remaining: number;
  hasLog: boolean;
  complete: boolean;
}

function hasRole(
  role: UserRole | null | undefined,
  allowed: UserRole[],
): boolean {
  return Boolean(role && allowed.includes(role));
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function getStatusStepIndex(status: OrderStatus): number {
  return STEP_STATUSES.indexOf(status);
}

export function getStageLogSummary(
  order: ProductionOrderDetail,
): StageLogSummary {
  const summary = order.workflow_summary;

  return {
    input: summary.stage_input,
    output: summary.stage_output,
    reject: summary.stage_reject,
    scrap: summary.stage_scrap,
    accounted: summary.stage_accounted,
    remaining: summary.stage_remaining,
    hasLog: summary.stage_accounted > 0,
    complete: summary.stage_complete,
  };
}

export function canReworkOrder(order: ProductionOrderDetail): boolean {
  if (order.status !== "qc") {
    return false;
  }

  return getStageLogSummary(order).reject > 0;
}

export function canCreateLog(
  order: ProductionOrderDetail,
  role: UserRole | null | undefined,
): boolean {
  if (!LOGGABLE_STATUSES.includes(order.status)) {
    return false;
  }

  const allowedRoles =
    order.status === "qc" ? QC_ROLES : FORWARD_ROLES;
  if (!hasRole(role, allowedRoles)) {
    return false;
  }

  return getStageLogSummary(order).remaining > 0;
}

export function canEditOrder(
  order: ProductionOrderDetail | { status: OrderStatus },
  role: UserRole | null | undefined,
): boolean {
  return hasRole(role, FORWARD_ROLES) && !isTerminalStatus(order.status);
}

export function canEditItems(
  order: ProductionOrderDetail | { status: OrderStatus },
): boolean {
  return order.status === "menunggu";
}

export function canArchiveOrder(
  order: ProductionOrderDetail | { status: OrderStatus },
  role: UserRole | null | undefined,
): boolean {
  return role === "admin" && isTerminalStatus(order.status);
}

export function getAvailableTransitions(
  status: OrderStatus,
  role: UserRole | null | undefined,
): WorkflowAction[] {
  if (!role || isTerminalStatus(status)) {
    return [];
  }

  const forwardAllowed = hasRole(role, FORWARD_ROLES);
  const qcAllowed = hasRole(role, QC_ROLES);
  const admin = role === "admin";

  const cancelAction = (): WorkflowAction => ({
    to: "dibatalkan",
    label: "Batalkan Perintah",
    tone: "danger",
    requiresNotes: true,
    isCancel: true,
    isRework: false,
  });

  switch (status) {
    case "menunggu":
      return forwardAllowed
        ? [
            {
              to: "cutting",
              label: "Mulai Cutting",
              tone: "primary",
              requiresNotes: false,
              isCancel: false,
              isRework: false,
            },
            cancelAction(),
          ]
        : [];

    case "cutting":
      return forwardAllowed
        ? [
            {
              to: "jahit",
              label: "Selesaikan Cutting",
              tone: "primary",
              requiresNotes: false,
              isCancel: false,
              isRework: false,
            },
            ...(admin ? [cancelAction()] : []),
          ]
        : [];

    case "jahit":
      return forwardAllowed
        ? [
            {
              to: "finishing",
              label: "Selesaikan Jahit",
              tone: "primary",
              requiresNotes: false,
              isCancel: false,
              isRework: false,
            },
            ...(admin ? [cancelAction()] : []),
          ]
        : [];

    case "finishing":
      return forwardAllowed
        ? [
            {
              to: "qc",
              label: "Kirim ke QC",
              tone: "primary",
              requiresNotes: false,
              isCancel: false,
              isRework: false,
            },
            ...(admin ? [cancelAction()] : []),
          ]
        : [];

    case "qc":
      return qcAllowed
        ? [
            {
              to: "selesai",
              label: "Selesaikan Produksi",
              tone: "primary",
              requiresNotes: false,
              isCancel: false,
              isRework: false,
            },
            {
              to: "jahit",
              label: "Kembalikan ke Jahit",
              tone: "secondary",
              requiresNotes: true,
              isCancel: false,
              isRework: true,
            },
            {
              to: "finishing",
              label: "Kembalikan ke Finishing",
              tone: "secondary",
              requiresNotes: true,
              isCancel: false,
              isRework: true,
            },
            ...(admin ? [cancelAction()] : []),
          ]
        : [];

    default:
      return [];
  }
}
