import { ProductWorkspace } from "@/components/catalog/product-workspace";

export const instant = false;

export const metadata = {
  title: "Produk | Sagara Denim",
  description: "Kelola data master model produk produksi.",
};

export default function ProdukPage() {
  return <ProductWorkspace />;
}
