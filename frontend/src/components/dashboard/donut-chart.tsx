import { formatNumber, formatPercent } from "@/lib/format";
import type { RejectPoint } from "@/types";

interface DonutChartProps {
  data: readonly RejectPoint[];
}

export function DonutChart({ data }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const percents = data.map((item) =>
    total > 0 ? (item.value / total) * 100 : 0,
  );

  return (
    <div className="donut-layout">
      <div className="donut-chart-wrapper">
        <svg
          viewBox="0 0 42 42"
          className="donut-svg"
          role="img"
          aria-label={`Komposisi reject, total ${total} pcs`}
        >
          <circle
            cx="21"
            cy="21"
            r="15.9155"
            fill="none"
            stroke="#F3F4F6"
            strokeWidth="6"
          />
          {data.map((item, index) => {
            const percent = percents[index];
            const offset = percents
              .slice(0, index)
              .reduce((sum, value) => sum + value, 0);

            return (
              <circle
                key={item.label}
                cx="21"
                cy="21"
                r="15.9155"
                fill="none"
                stroke={item.color}
                strokeWidth="6"
                pathLength={100}
                strokeDasharray={`${percent} ${100 - percent}`}
                strokeDashoffset={-offset}
                className="donut-segment"
              />
            );
          })}
        </svg>
        <div className="donut-center">
          <span className="donut-center-value">{formatNumber(total)}</span>
          <span className="donut-center-subtext">pcs reject</span>
        </div>
      </div>

      <div className="donut-legend">
        {data.map((item) => {
          const percent = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div className="donut-legend-item" key={item.label}>
              <span
                className="donut-legend-dot"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span className="donut-legend-name">{item.label}</span>
              <span className="donut-legend-value">
                {formatNumber(item.value)}
              </span>
              <span className="donut-legend-percent">
                {formatPercent(percent, 0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
