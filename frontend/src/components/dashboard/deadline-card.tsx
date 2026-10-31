import { mdiArrowRight } from "@mdi/js";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { PriorityBadge } from "@/components/ui/badge";
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
      subtitle="Order yang perlu perhatian"
      action={
        <Link href="/order-produksi" className="section-link">
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
              <PriorityBadge priority={item.priority} />
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
