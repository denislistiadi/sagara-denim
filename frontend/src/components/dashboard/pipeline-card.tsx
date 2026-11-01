import { mdiArrowRight } from "@mdi/js";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { SectionCard } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import type { PipelineStage } from "@/types";

const STAGE_TONE = {
  Cutting: "blue",
  Jahit: "orange",
  Finishing: "purple",
  QC: "green",
} as const;

export function PipelineCard({
  stages,
}: {
  stages: readonly PipelineStage[];
}) {
  const total = stages.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <SectionCard
      className="dashboard-panel"
      contentClassName="pipeline-body"
      title="Antrean Produksi"
      subtitle="Distribusi perintah per tahap"
      action={
        <Link href="/antrean-produksi" className="section-link">
          Lihat antrean
          <Icon path={mdiArrowRight} size={15} />
        </Link>
      }
    >
      <div className="pipeline-list">
        {stages.map((stage) => (
          <div className="pipeline-row" key={stage.label}>
            <span
              className="pipeline-icon"
              style={{
                color: stage.color,
                backgroundColor: `${stage.color}14`,
              }}
            >
              <Icon path={stage.icon} size={18} />
            </span>

            <div className="pipeline-main">
              <div className="pipeline-head">
                <span className="pipeline-name">{stage.label}</span>
                <span className="pipeline-count">{stage.count} order</span>
              </div>
              <Progress
                value={stage.percent}
                tone={STAGE_TONE[stage.label as keyof typeof STAGE_TONE] ?? "orange"}
                label={`${stage.label}: ${stage.count} order`}
                className="pipeline-progress"
              />
            </div>
          </div>
        ))}
      </div>

      <div className={cn("pipeline-footer")}>
        <span>Total dalam antrean</span>
        <strong>{total} order</strong>
      </div>
    </SectionCard>
  );
}
