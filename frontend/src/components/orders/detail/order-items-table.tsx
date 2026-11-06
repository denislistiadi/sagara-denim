import { formatNumber } from "@/lib/format";
import type { ProductionOrderItem } from "@/types";

/** Rincian model dan jumlah di dalam perintah produksi. */
export function OrderItemsTable({ items }: { items: ProductionOrderItem[] }) {
  return (
    <section className="order-panel">
      <div className="order-panel-head">
        <div>
          <h2>Item Model</h2>
          <p>Rincian model dan jumlah di dalam perintah ini.</p>
        </div>
      </div>
      <div className="table-scroll">
        <table className="ds-table order-item-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Model</th>
              <th>Ukuran</th>
              <th>Warna</th>
              <th>Jumlah</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="code-badge">{item.product.code}</span>
                </td>
                <td>
                  <span className="table-primary">{item.product.name}</span>
                </td>
                <td>{item.product.size ?? "—"}</td>
                <td>{item.product.color ?? "—"}</td>
                <td>
                  <span className="table-number">
                    {formatNumber(item.quantity)}
                  </span>{" "}
                  <span className="table-unit">pcs</span>
                </td>
                <td>{item.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
