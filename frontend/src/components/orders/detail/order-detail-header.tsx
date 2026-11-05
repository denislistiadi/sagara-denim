import { mdiArrowLeft, mdiChartBoxOutline } from "@mdi/js";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/layout/page-header";
import { todayISO, toWIBDate } from "@/lib/date";
import { formatDateTime } from "@/lib/format";
import type { ProductionOrderDetail } from "@/types";

/** Tautan ke halaman laporan yang sudah terfilter ke perintah ini. */
function reportHref(order: ProductionOrderDetail): string {
  const start = toWIBDate(order.created_at) ?? todayISO();
  const params = new URLSearchParams({
    order_id: order.id,
    order_code: order.code,
    start_date: start,
    end_date: todayISO(),
  });

  return `/laporan?${params.toString()}`;
}

/** Baris kembali, judul, dan aksi laporan untuk layar detail perintah. */
export function OrderDetailHeader({ order }: { order: ProductionOrderDetail }) {
  return (
    <>
      <Link href="/perintah-produksi" className="back-link">
        <Icon path={mdiArrowLeft} size={16} />
        Kembali ke daftar perintah
      </Link>

      <PageHeader
        title={order.code}
        subtitle={`Dibuat ${formatDateTime(order.created_at)} oleh ${
          order.created_by?.name ?? "sistem"
        }.`}
        actions={
          <Link
            href={reportHref(order)}
            className="ds-btn ds-btn-secondary ds-btn-sm"
          >
            <Icon path={mdiChartBoxOutline} size={16} />
            Lihat Laporan
          </Link>
        }
      />
    </>
  );
}
