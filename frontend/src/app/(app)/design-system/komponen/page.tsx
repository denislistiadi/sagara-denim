import { ComponentGallery } from "@/components/design-system/component-gallery";
import { PageHeader } from "@/components/layout/page-header";
import { DocsNav } from "@/components/ui/docs-nav";

export const instant = false;

export const metadata = {
  title: "Komponen",
};

export default function KomponenPage() {
  return (
    <>
      <PageHeader
        title="Komponen"
        subtitle="Galeri komponen dasar Sagara Denim beserta state-nya."
      />
      <DocsNav />
      <ComponentGallery />
    </>
  );
}
