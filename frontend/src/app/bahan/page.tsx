import { mdiArrowLeft, mdiLayersOutline } from "@mdi/js";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "Bahan & Aksesoris",
};

export default function BahanPage() {
  return (
    <>
      <PageHeader
        title="Bahan & Aksesoris"
        subtitle="Stok kain, benang, kancing, dan aksesoris produksi."
      />

      <section className="placeholder-card">
        <EmptyState
          icon={mdiLayersOutline}
          title="Belum termasuk cakupan design system"
          description="Kartu stok dan peringatan low-stock sudah tersedia sebagai komponen di dashboard. Halaman stok lengkap akan dibangun pada tahap aplikasi penuh."
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
