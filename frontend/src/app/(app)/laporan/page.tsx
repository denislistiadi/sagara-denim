import { mdiArrowLeft, mdiChartBoxOutline } from "@mdi/js";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const instant = false;

export const metadata = {
  title: "Laporan",
};

export default function LaporanPage() {
  return (
    <>
      <PageHeader
        title="Laporan"
        subtitle="Rekap output, kualitas, dan performa produksi."
      />

      <section className="placeholder-card">
        <EmptyState
          icon={mdiChartBoxOutline}
          title="Belum termasuk cakupan design system"
          description="Halaman laporan akan dibangun setelah struktur data produksi dan API FastAPI tersedia."
          action={
            <Link href="/" className="ds-btn ds-btn-secondary ds-btn-sm">
              <Icon path={mdiArrowLeft} size={16} />
              Kembali ke dashboard
            </Link>
          }
        />
      </section>
    </>
  );
}
