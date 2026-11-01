import { mdiCheckCircleOutline, mdiInformationOutline } from "@mdi/js";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { DocsNav } from "@/components/ui/docs-nav";
import {
  COLOR_TOKENS,
  ICON_SAMPLES,
  RADIUS_TOKENS,
  SHADOW_TOKENS,
  SPACING_TOKENS,
  TYPE_TOKENS,
} from "@/lib/design-tokens";

export const metadata = {
  title: "Fondasi",
};

export default function FondasiPage() {
  return (
    <>
      <PageHeader
        title="Fondasi"
        subtitle="Token visual yang menjadi sumber kebenaran seluruh antarmuka."
      />
      <DocsNav />

      <section className="docs-section" id="warna">
        <div className="docs-section-head">
          <span className="docs-kicker">01 · Warna</span>
          <h2>Palet dan perannya</h2>
          <p>
            Gunakan token semantik, bukan nilai hex langsung. Oranye untuk
            aksi, charcoal untuk navigasi, dan abu-abu untuk informasi
            sekunder.
          </p>
        </div>

        <div className="docs-swatch-grid">
          {COLOR_TOKENS.map((token) => (
            <article className="docs-swatch" key={token.name}>
              <div
                className="docs-swatch-color"
                style={{ backgroundColor: token.value }}
                data-dark={token.dark ? "true" : "false"}
              />
              <div className="docs-swatch-info">
                <div className="docs-swatch-name-row">
                  <strong>{token.name}</strong>
                  <span className="docs-swatch-hex">{token.value}</span>
                </div>
                <code className="docs-swatch-var">{token.variable}</code>
                <p>{token.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="docs-section" id="tipografi">
        <div className="docs-section-head">
          <span className="docs-kicker">02 · Tipografi</span>
          <h2>Plus Jakarta Sans</h2>
          <p>
            Satu keluarga huruf untuk seluruh aplikasi. Bobot 700 dipakai untuk
            judul dan angka penting, 600 untuk label, 400 untuk isi.
          </p>
        </div>

        <div className="docs-type-card">
          {TYPE_TOKENS.map((token) => (
            <div className="docs-type-row" key={token.name}>
              <div className="docs-type-meta">
                <strong>{token.name}</strong>
                <span>{token.meta}</span>
              </div>
              <div className={token.className}>{token.sample}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="docs-section" id="spacing">
        <div className="docs-section-head">
          <span className="docs-kicker">03 · Spacing</span>
          <h2>Ritme 4px</h2>
          <p>
            Jarak utama memakai kelipatan 4px. Konten halaman memakai padding
            24px di desktop dan 16px di tablet.
          </p>
        </div>

        <div className="docs-spacing-card">
          {SPACING_TOKENS.map((token) => (
            <div className="docs-spacing-row" key={token.name}>
              <span className="docs-spacing-label">{token.name}</span>
              <span
                className="docs-spacing-bar"
                style={{ width: token.value }}
              />
              <span className="docs-spacing-value">{token.value}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="docs-two-column">
        <section className="docs-section" id="radius">
          <div className="docs-section-head">
            <span className="docs-kicker">04 · Radius</span>
            <h2>Sudut membulat</h2>
            <p>Radius mengikuti peran komponen, bukan selera per halaman.</p>
          </div>

          <div className="docs-radius-grid">
            {RADIUS_TOKENS.map((token) => (
              <div className="docs-radius-item" key={token.name}>
                <span
                  className="docs-radius-box"
                  style={{ borderRadius: token.value }}
                />
                <div>
                  <strong>{token.name}</strong>
                  <span>{token.value}</span>
                  <p>{token.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="docs-section" id="shadow">
          <div className="docs-section-head">
            <span className="docs-kicker">05 · Elevasi</span>
            <h2>Bayangan lembut</h2>
            <p>
              Kartu memakai bayangan tipis. Glow oranye hanya untuk aksi
              utama.
            </p>
          </div>

          <div className="docs-shadow-grid">
            {SHADOW_TOKENS.map((token) => (
              <div className={`docs-shadow-card ${token.className}`} key={token.name}>
                <strong>{token.name}</strong>
                <span>{token.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="docs-section" id="ikon">
        <div className="docs-section-head">
          <span className="docs-kicker">06 · Ikonografi</span>
          <h2>Material Design Icons</h2>
          <p>
            Ikon 20px dengan stroke visual yang konsisten. Ikon navigasi
            mewarisi warna teks; ikon status boleh memakai warna semantik.
          </p>
        </div>

        <div className="docs-icon-grid">
          {ICON_SAMPLES.map((sample) => (
            <div className="docs-icon-item" key={sample.name}>
              <span className="docs-icon-box">
                <Icon path={sample.icon} size={20} />
              </span>
              <span>{sample.name}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="docs-two-column">
        <section className="docs-section" id="motion">
          <div className="docs-section-head">
            <span className="docs-kicker">07 · Motion</span>
            <h2>Gerak yang membantu</h2>
            <p>
              Transisi 150–200ms untuk hover dan fokus. 400ms hanya untuk
              perubahan data seperti progress.
            </p>
          </div>

          <div className="docs-motion-list">
            <div>
              <Badge tone="orange">150ms</Badge>
              <span>Hover tombol dan item sidebar</span>
            </div>
            <div>
              <Badge tone="blue">200ms</Badge>
              <span>Kartu, dropdown, dan dialog</span>
            </div>
            <div>
              <Badge tone="purple">400ms</Badge>
              <span>Progress bar dan chart</span>
            </div>
          </div>
        </section>

        <section className="docs-section" id="aksesibilitas">
          <div className="docs-section-head">
            <span className="docs-kicker">08 · Aksesibilitas</span>
            <h2>Kontras dan fokus</h2>
            <p>
              Fokus selalu terlihat. Oranye untuk teks kecil memakai varian
              lebih gelap agar tetap terbaca.
            </p>
          </div>

          <div className="docs-accessibility-card">
            <div>
              <Icon path={mdiCheckCircleOutline} size={20} />
              <span>Focus ring 2px dengan offset 2px</span>
            </div>
            <div>
              <Icon path={mdiInformationOutline} size={20} />
              <span>Status memakai teks, bukan hanya warna</span>
            </div>
            <div>
              <Icon path={mdiCheckCircleOutline} size={20} />
              <span>Target sentuh minimal 34×34px</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
