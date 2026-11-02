import {
  mdiArrowRight,
  mdiCheckCircleOutline,
  mdiPaletteOutline,
  mdiVectorSquare,
  mdiViewDashboardOutline,
  mdiViewGridOutline,
} from "@mdi/js";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/layout/page-header";
import { DocsNav } from "@/components/ui/docs-nav";
import { COLOR_TOKENS } from "@/lib/design-tokens";

const PRINCIPLES = [
  {
    title: "Konsisten",
    description:
      "Warna, radius, dan jarak diambil dari token yang sama. Tidak ada hex baru hanya karena satu halaman terlihat berbeda.",
    icon: mdiCheckCircleOutline,
  },
  {
    title: "Terbaca",
    description:
      "Hierarki dibuat jelas: judul gelap, metadata abu-abu, aksi oranye. Warna status tidak pernah menjadi satu-satunya pembeda.",
    icon: mdiPaletteOutline,
  },
  {
    title: "Terasa Sagara",
    description:
      "Karakter visualnya hangat dan lokal: kanvas terang, sidebar charcoal, dan aksen oranye yang tegas namun tidak berlebihan.",
    icon: mdiVectorSquare,
  },
] as const;

const EXPLORE_CARDS = [
  {
    href: "/design-system/fondasi",
    title: "Fondasi",
    description: "Warna, tipografi, spacing, radius, shadow, dan ikon.",
    icon: mdiPaletteOutline,
  },
  {
    href: "/design-system/komponen",
    title: "Komponen",
    description: "Tombol, input, badge, tabel, dialog, toast, dan state.",
    icon: mdiViewGridOutline,
  },
  {
    href: "/design-system/pola",
    title: "Pola",
    description: "Shell, page header, toolbar tabel, form dialog, dan empty state.",
    icon: mdiVectorSquare,
  },
  {
    href: "/",
    title: "Preview Dashboard",
    description: "Lihat design system bekerja pada dashboard produksi.",
    icon: mdiViewDashboardOutline,
  },
] as const;

export const instant = false;

export const metadata = {
  title: "Design System",
};

export default function DesignSystemPage() {
  return (
    <>
      <PageHeader
        title="Design System"
        subtitle="Fondasi visual Sagara Denim untuk aplikasi produksi celana jeans."
      />
      <DocsNav />

      <section className="docs-hero">
        <div className="docs-hero-copy">
          <span className="docs-eyebrow">
            <span className="docs-eyebrow-dot" />
            Sagara Denim · v1.0
          </span>
          <h2 className="docs-hero-title">
            Bahasa visual untuk produksi yang rapi.
          </h2>
          <p className="docs-hero-description">
            Satu set token dan komponen untuk menjaga dashboard, order
            produksi, dan halaman berikutnya tetap terasa satu produk—meski
            dibangun dengan Next.js dan Tailwind, bukan Vuetify.
          </p>
          <div className="docs-hero-actions">
            <Link
              href="/design-system/fondasi"
              className="ds-btn ds-btn-primary"
            >
              Jelajahi fondasi
              <Icon path={mdiArrowRight} size={17} />
            </Link>
            <Link
              href="/design-system/komponen"
              className="ds-btn ds-btn-secondary"
            >
              Lihat komponen
            </Link>
          </div>
        </div>

        <div className="docs-hero-visual" aria-hidden="true">
          <div className="docs-brand-card">
            <BrandMark />
            <div className="docs-brand-rule" />
            <div className="docs-brand-meta">
              <span>Warna utama</span>
              <span className="docs-brand-hex">#FF5B00</span>
            </div>
          </div>

          <div className="docs-hero-mini-card">
            <span className="docs-mini-label">Output hari ini</span>
            <strong>186 pcs</strong>
            <div className="docs-mini-progress">
              <span />
            </div>
          </div>

          <div className="docs-hero-swatches">
            <span style={{ background: "#FF5B00" }} />
            <span style={{ background: "#16181D" }} />
            <span style={{ background: "#F8F9FA" }} />
            <span style={{ background: "#10B981" }} />
          </div>
        </div>
      </section>

      <section className="docs-stat-grid" aria-label="Ringkasan design system">
        <div className="docs-stat">
          <strong>15</strong>
          <span>token warna</span>
        </div>
        <div className="docs-stat">
          <strong>18</strong>
          <span>komponen dasar</span>
        </div>
        <div className="docs-stat">
          <strong>5</strong>
          <span>pola halaman</span>
        </div>
        <div className="docs-stat">
          <strong>2</strong>
          <span>halaman preview</span>
        </div>
      </section>

      <section className="docs-section">
        <div className="docs-section-head">
          <span className="docs-kicker">01 · Prinsip</span>
          <h2>Tiga hal yang menjaga arah visual</h2>
          <p>
            Sebelum menambah komponen baru, pastikan keputusan visual masih
            mengikuti prinsip berikut.
          </p>
        </div>

        <div className="docs-principle-grid">
          {PRINCIPLES.map((principle) => (
            <article className="docs-principle-card" key={principle.title}>
              <span className="docs-principle-icon">
                <Icon path={principle.icon} size={20} />
              </span>
              <h3>{principle.title}</h3>
              <p>{principle.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="docs-section">
        <div className="docs-section-head">
          <span className="docs-kicker">02 · Warna inti</span>
          <h2>Palet yang sama, peran yang jelas</h2>
          <p>
            Oranye adalah aksi. Charcoal adalah navigasi. Abu-abu adalah
            informasi sekunder.
          </p>
        </div>

        <div className="docs-color-strip">
          {COLOR_TOKENS.slice(0, 10).map((token) => (
            <div className="docs-color-chip" key={token.name}>
              <span
                className="docs-color-chip-swatch"
                style={{ backgroundColor: token.value }}
              />
              <span className="docs-color-chip-info">
                <strong>{token.name}</strong>
                <span>{token.value}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="docs-section">
        <div className="docs-section-head">
          <span className="docs-kicker">03 · Jelajahi</span>
          <h2>Mulai dari bagian yang paling dibutuhkan</h2>
        </div>

        <div className="docs-explore-grid">
          {EXPLORE_CARDS.map((card) => (
            <Link className="docs-explore-card" href={card.href} key={card.href}>
              <span className="docs-explore-icon">
                <Icon path={card.icon} size={20} />
              </span>
              <div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </div>
              <Icon
                path={mdiArrowRight}
                size={18}
                className="docs-explore-arrow"
              />
            </Link>
          ))}
        </div>
      </section>

      <section className="docs-note-card">
        <div>
          <span className="docs-kicker">Catatan implementasi</span>
          <h2>Token dulu, komponen kemudian.</h2>
          <p>
            Semua warna dan ukuran diambil dari CSS variables di{" "}
            <code>globals.css</code>. Komponen tidak menyimpan hex sendiri,
            sehingga perubahan brand cukup dilakukan di satu tempat.
          </p>
        </div>
        <div className="docs-note-badge">
          <Icon path={mdiCheckCircleOutline} size={20} />
          Tailwind v4 + CSS variables
        </div>
      </section>
    </>
  );
}
