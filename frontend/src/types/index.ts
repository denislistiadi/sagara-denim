/**
 * Titik masuk tipe domain bersama.
 *
 * Implementasi dipecah per domain di folder ini:
 *
 * - `common` — peran, tone, dan ringkasan entitas (user, pelanggan, produk)
 * - `order` — perintah produksi, workflow, dan antrean
 * - `catalog` — data master pelanggan dan produk
 * - `material` — bahan, aksesoris, dan mutasi stok
 * - `report` — laporan produksi
 * - `dashboard` — ringkasan dashboard
 * - `user` — data master pengguna
 * - `design-system` — tipe data contoh untuk galeri komponen
 *
 * File ini hanya me-re-export agar impor lama (`@/types`) tetap berfungsi.
 */

export type {
  CustomerSummary,
  NavItem,
  ProductSummary,
  Tone,
  UserRole,
  UserSummary,
} from "./common";

export type {
  OrderStatus,
  OrderStatusHistoryEntry,
  Priority,
  ProductionLogEntry,
  ProductionLogInput,
  ProductionOrderDetail,
  ProductionOrderItem,
  ProductionOrderListItem,
  ProductionOrderListResponse,
  ProductionQueueResponse,
  ProductionQueueStage,
  ProductionStatusUpdateInput,
} from "./order";

export type {
  CatalogActiveFilter,
  CatalogListResponse,
  CustomerRecord,
  ProductRecord,
} from "./catalog";

export type {
  MaterialDetail,
  MaterialInventorySummary,
  MaterialListResponse,
  MaterialSummary,
  ProductionOrderRef,
  StockMovement,
  StockMovementListResponse,
  StockMovementType,
  StockStatus,
} from "./material";

export type {
  ProductionReportDaily,
  ProductionReportFilters,
  ProductionReportLog,
  ProductionReportLogList,
  ProductionReportResponse,
  ProductionReportStage,
  ProductionReportSummary,
  ProductionStage,
} from "./report";

export type {
  DashboardDailyOutput,
  DashboardDeadline,
  DashboardKpis,
  DashboardPipelineStage,
  DashboardRejectStage,
  DashboardStockItem,
  DashboardSummary,
} from "./dashboard";

export type {
  UserActiveFilter,
  UserRecord,
} from "./user";

export type {
  DeadlineItem,
  KpiItem,
  OutputPoint,
  PipelineStage,
  ProductionOrder,
  RejectPoint,
  StockItem,
} from "./design-system";
