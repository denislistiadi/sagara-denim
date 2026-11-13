import type { AuthUser } from "@/lib/api";
import type {
  CustomerRecord,
  CustomerSummary,
  MaterialDetail,
  ProductRecord,
  ProductSummary,
  ProductionOrderDetail,
  UserRecord,
  UserSummary,
  WorkflowSummary,
} from "@/types";

const CREATED_AT = "2026-11-01T08:00:00+07:00";
const UPDATED_AT = "2026-11-01T08:00:00+07:00";

export function makeCustomerSummary(
  overrides: Partial<CustomerSummary> = {},
): CustomerSummary {
  return {
    id: "customer-1",
    code: "CUS-001",
    name: "PT Nusantara Denim",
    ...overrides,
  };
}

export function makeCustomer(
  overrides: Partial<CustomerRecord> = {},
): CustomerRecord {
  return {
    ...makeCustomerSummary(),
    phone: "081234567890",
    email: "kontak@nusantara.co.id",
    address: "Bandung",
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
    ...overrides,
  };
}

export function makeProductSummary(
  overrides: Partial<ProductSummary> = {},
): ProductSummary {
  return {
    id: "product-1",
    code: "PRD-DNM-001",
    name: "Denim Regular",
    size: "32",
    color: "Indigo",
    ...overrides,
  };
}

export function makeProduct(
  overrides: Partial<ProductRecord> = {},
): ProductRecord {
  return {
    ...makeProductSummary(),
    description: null,
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
    ...overrides,
  };
}

export function makeUserSummary(
  overrides: Partial<UserSummary> = {},
): UserSummary {
  return {
    id: "user-1",
    name: "Admin Produksi",
    role: "admin",
    ...overrides,
  };
}

export function makeUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    email: "admin@sagara.co.id",
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
    ...makeUserSummary(),
    ...overrides,
  };
}

export function makeAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    ...makeUser(),
    ...overrides,
  };
}

export function makeMaterial(
  overrides: Partial<MaterialDetail> = {},
): MaterialDetail {
  return {
    id: "material-1",
    sku: "MTL-DNM-14",
    name: "Denim Raw 14 oz",
    category: "Kain",
    unit: "meter",
    stock_qty: "20",
    minimum_stock: "10",
    status: "aman",
    is_active: true,
    movement_count: 0,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
    ...overrides,
  };
}

export function makeWorkflowSummary(
  overrides: Partial<WorkflowSummary> = {},
): WorkflowSummary {
  return {
    stage_input: 0,
    stage_output: 0,
    stage_reject: 0,
    stage_scrap: 0,
    stage_accounted: 0,
    stage_remaining: 0,
    stage_progress: 0,
    stage_complete: false,
    final_output: 0,
    final_loss: 0,
    ...overrides,
  };
}

export function makeProductionOrder(
  overrides: Partial<ProductionOrderDetail> = {},
): ProductionOrderDetail {
  return {
    id: "order-1",
    code: "PRD-2611-001",
    customer: null,
    pic: null,
    status: "menunggu",
    priority: "normal",
    deadline: null,
    total_quantity: 50,
    item_count: 1,
    model_summary: "Denim Regular",
    progress: 0,
    notes: null,
    started_at: null,
    completed_at: null,
    created_by: null,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
    items: [
      {
        id: "item-1",
        product: makeProductSummary(),
        quantity: 50,
        notes: null,
      },
    ],
    status_history: [],
    production_logs: [],
    workflow_summary: makeWorkflowSummary(),
    ...overrides,
  };
}
