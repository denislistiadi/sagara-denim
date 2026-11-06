import { CustomerWorkspace } from "@/components/catalog/customer-workspace";

export const instant = false;

export const metadata = {
  title: "Pelanggan | Sagara Denim",
  description: "Kelola data master pelanggan produksi.",
};

export default function PelangganPage() {
  return <CustomerWorkspace />;
}
