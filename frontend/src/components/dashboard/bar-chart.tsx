import { formatNumber } from "@/lib/format";
import type { OutputPoint } from "@/types";

interface BarChartProps {
  data: readonly OutputPoint[];
  title?: string;
}

export function BarChart({ data, title = "Output produksi harian" }: BarChartProps) {
  const peak = Math.max(...data.map((item) => item.value), 1);
  const maxValue = Math.ceil(peak / 60) * 60;
  const ticks = Array.from({ length: 5 }, (_, index) =>
    Math.round((maxValue / 4) * (4 - index)),
  );

  return (
    <div className="bar-chart" role="img" aria-label={title}>
      <div className="bar-chart-axis" aria-hidden="true">
        {ticks.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>

      <div className="bar-chart-body">
        <div className="bar-chart-plot">
          <div className="bar-chart-grid" aria-hidden="true">
            {ticks.map((tick) => (
              <span key={tick} className="bar-chart-grid-line" />
            ))}
          </div>

          <div className="bar-chart-bars">
            {data.map((item) => (
              <div className="bar-chart-slot" key={item.day}>
                <div
                  className="bar-chart-bar"
                  style={{
                    height: `${Math.max(4, (item.value / maxValue) * 100)}%`,
                  }}
                >
                  <span className="bar-chart-tooltip">
                    {formatNumber(item.value)} pcs
                  </span>
                </div>
                <span className="sr-only">
                  {item.day}: {formatNumber(item.value)} pcs
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bar-chart-xaxis" aria-hidden="true">
          {data.map((item) => (
            <span key={item.day}>{item.day}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
