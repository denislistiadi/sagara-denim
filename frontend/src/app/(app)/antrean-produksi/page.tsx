import { mdiArrowLeft, mdiFactory } from "@mdi/js";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "Antrean Produksi",
};

export default function AntreanProduksiPage() {
  return (
    <>
      <PageHeader
        title="Antrean Produksi"
        subtitle="Pantau pergerakan perintah di setiap tahap produksi."
      />

      <section className="placeholder-card">
        <EmptyState
          icon={mdiFactory}
          title="Belum termasuk cakupan design system"
          description="Halaman antrean produksi akan dibangun pada tahap aplikasi penuh, setelah pola tabel, status, dan progress divalidasi."
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
