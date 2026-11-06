import { mdiArrowRight } from "@mdi/js";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { DeadlineItem } from "@/types";

export function DeadlineCard({
  deadlines,
}: {
  deadlines: readonly DeadlineItem[];
}) {
  return (
    <SectionCard
      className="dashboard-panel"
      title="Deadline Terdekat"
      subtitle="Perintah yang perlu perhatian"
      action={
        <Link href="/perintah-produksi" className="section-link">
          Lihat semua
          <Icon path={mdiArrowRight} size={15} />
        </Link>
      }
    >
      <div className="deadline-list">
        {deadlines.map((item) => {
          const [day, month] = formatDate(item.deadline).split(" ");

          return (
            <div className="deadline-item" key={item.code}>
              <span className="deadline-date">
                <strong>{day}</strong>
                <span>{month}</span>
              </span>
              <div className="deadline-main">
                <span className="deadline-model">{item.model}</span>
                <span className="deadline-meta">
                  {item.code} · {item.customer}
                </span>
              </div>
              {item.isOverdue ? (
                <Badge tone="red">Terlambat</Badge>
              ) : (
                <PriorityBadge priority={item.priority} />
              )}
            </div>
          );
        })}
      </div>

      {deadlines.length === 0 && (
        <p className="dashboard-panel-empty">
          Belum ada deadline order aktif yang perlu dipantau.
        </p>
      )}
    </SectionCard>
  );
}
