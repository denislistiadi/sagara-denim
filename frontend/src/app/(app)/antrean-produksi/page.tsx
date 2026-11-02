import { ProductionQueueBoard } from "@/components/queue/production-queue-board";

export const instant = false;

export const metadata = {
  title: "Antrean Produksi",
};

export default function AntreanProduksiPage() {
  return <ProductionQueueBoard />;
}
