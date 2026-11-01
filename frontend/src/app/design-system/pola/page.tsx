import {
  mdiAlertCircleOutline,
  mdiCheckCircleOutline,
  mdiCloseCircleOutline,
  mdiMagnify,
  mdiPlus,
} from "@mdi/js";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { PatternDialogDemo } from "@/components/design-system/pattern-dialog-demo";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DocsNav } from "@/components/ui/docs-nav";
import { SearchInput } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Pola",
};

export default function PolaPage() {
  return (
    <>
      <PageHeader
        title="Pola"
        subtitle="Susunan komponen yang berulang di seluruh aplikasi."
      />
      <DocsNav />

      <section className="docs-section">
        <div className="docs-section-head">
          <span className="docs-kicker">01 · App shell</span>
          <h2>Kerangka yang selalu sama</h2>
          <p>
            Sidebar gelap 240px, header 60px, dan kanvas terang. Di bawah 960px
            sidebar berubah menjadi overlay.
          </p>
        </div>

        <div className="pattern-shell">
          <div className="pattern-shell-sidebar">
            <span className="pattern-shell-logo" />
            <span className="pattern-shell-nav pattern-shell-nav-active" />
            <span className="pattern-shell-nav" />
            <span className="pattern-shell-nav" />
            <span className="pattern-shell-nav pattern-shell-nav-short" />
          </div>
          <div className="pattern-shell-main">
            <div className="pattern-shell-header">
              <span className="pattern-shell-toggle" />
              <span className="pattern-shell-title" />
              <span className="pattern-shell-user" />
            </div>
            <div className="pattern-shell-content">
              <span className="pattern-shell-page-title" />
              <span className="pattern-shell-page-subtitle" />
              <div className="pattern-shell-cards">
                <span />
                <span />
                <span />
              </div>
              <div className="pattern-shell-panel" />
            </div>
          </div>
          <div className="pattern-shell-labels" aria-hidden="true">
            <span className="pattern-label-sidebar">Sidebar 240px</span>
            <span className="pattern-label-header">Header 60px</span>
            <span className="pattern-label-content">Canvas #F8F9FA</span>
          </div>
        </div>
      </section>

      <section className="docs-section">
        <div className="docs-section-head">
          <span className="docs-kicker">02 · Page header</span>
          <h2>Judul, konteks, aksi</h2>
          <p>
            Setiap halaman dimulai dengan judul 19px, subjudul 13px, dan aksi
            utama di sisi kanan.
          </p>
        </div>

        <div className="pattern-canvas">
          <div className="pattern-page-header">
            <div>
              <h3>Order Produksi</h3>
              <p>Kelola order produksi celana jeans dari cutting sampai selesai.</p>
            </div>
            <span className="ds-btn ds-btn-primary ds-btn-sm">
              <Icon path={mdiPlus} size={17} />
              Buat Order Produksi
            </span>
          </div>
        </div>
      </section>

      <section className="docs-section">
        <div className="docs-section-head">
          <span className="docs-kicker">03 · Toolbar tabel</span>
          <h2>Pencarian dan filter</h2>
          <p>
            Search pill di kiri, filter status di kanan. Toolbar selalu berada
            di atas tabel dan menyatu dengan kartu.
          </p>
        </div>

        <div className="pattern-canvas pattern-toolbar-canvas">
          <div className="table-toolbar pattern-toolbar">
            <SearchInput
              placeholder="Cari kode, model, pelanggan, atau PIC..."
              aria-label="Contoh pencarian order"
              wrapperClassName="table-search"
            />
            <Select defaultValue="Semua">
              <SelectTrigger
                className="table-filter"
                aria-label="Contoh filter status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="Semua">Semua status</SelectItem>
                <SelectItem value="Cutting">Cutting</SelectItem>
                <SelectItem value="Jahit">Jahit</SelectItem>
                <SelectItem value="Selesai">Selesai</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="pattern-toolbar-hint">
            <Icon path={mdiMagnify} size={17} />
            Gunakan kata kunci yang spesifik agar hasil cepat ditemukan.
          </div>
        </div>
      </section>

      <section className="docs-section">
        <div className="docs-section-head">
          <span className="docs-kicker">04 · Form dialog</span>
          <h2>Keputusan tanpa pindah halaman</h2>
          <p>
            Dialog dipakai untuk membuat order, konfirmasi hapus, atau aksi
            singkat lain. Maksimal dua kolom di desktop.
          </p>
        </div>

        <div className="pattern-canvas pattern-dialog-canvas">
          <div>
            <h3>Form Order Produksi</h3>
            <p>
              Field pendek berdampingan, catatan memenuhi lebar penuh, aksi di
              kanan bawah.
            </p>
          </div>
          <PatternDialogDemo />
        </div>
      </section>

      <section className="docs-section">
        <div className="docs-section-head">
          <span className="docs-kicker">05 · State</span>
          <h2>Loading, kosong, error</h2>
          <p>
            State tidak boleh terasa seperti halaman yang rusak. Beri konteks
            dan langkah berikutnya.
          </p>
        </div>

        <div className="pattern-state-grid">
          <article className="pattern-state-card">
            <span className="pattern-state-label">Loading</span>
            <TableSkeleton rows={3} />
          </article>

          <article className="pattern-state-card">
            <span className="pattern-state-label">Kosong</span>
            <EmptyState
              title="Belum ada order"
              description="Mulai dengan membuat order produksi pertama."
              action={
                <Link href="/order-produksi" className="ds-btn ds-btn-primary ds-btn-sm">
                  <Icon path={mdiPlus} size={16} />
                  Buat Order
                </Link>
              }
            />
          </article>

          <article className="pattern-state-card">
            <span className="pattern-state-label">Error</span>
            <div className="component-error-box">
              <Icon path={mdiAlertCircleOutline} size={20} />
              <div>
                <strong>Gagal memuat order</strong>
                <p>Periksa koneksi API lalu coba lagi.</p>
              </div>
            </div>
            <span className="ds-btn ds-btn-secondary ds-btn-sm">Muat ulang</span>
          </article>
        </div>
      </section>

      <section className="docs-section">
        <div className="docs-section-head">
          <span className="docs-kicker">06 · Panduan</span>
          <h2>Lakukan dan hindari</h2>
        </div>

        <div className="docs-guideline-grid">
          <article className="docs-guideline-card docs-guideline-do">
            <div className="docs-guideline-head">
              <Icon path={mdiCheckCircleOutline} size={20} />
              <h3>Lakukan</h3>
            </div>
            <ul>
              <li>Gunakan token warna dan radius yang sudah ada.</li>
              <li>Pertahankan satu aksi utama per area.</li>
              <li>Tampilkan status dengan teks dan warna.</li>
              <li>Beri jarak 24px antar bagian halaman.</li>
            </ul>
          </article>

          <article className="docs-guideline-card docs-guideline-dont">
            <div className="docs-guideline-head">
              <Icon path={mdiCloseCircleOutline} size={20} />
              <h3>Hindari</h3>
            </div>
            <ul>
              <li>Menambah hex baru tanpa memperbarui token.</li>
              <li>Memakai lebih dari satu tombol gradient.</li>
              <li>Menyembunyikan status hanya dengan warna.</li>
              <li>Membuat radius berbeda untuk komponen sejenis.</li>
            </ul>
          </article>
        </div>
      </section>
    </>
  );
}
