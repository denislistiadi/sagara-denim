import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  tone?: "dark" | "orange" | "light";
}

export function Avatar({
  name,
  size = "md",
  className,
  tone = "dark",
}: AvatarProps) {
  return (
    <span
      className={cn(
        "ds-avatar",
        `ds-avatar-${size}`,
        `ds-avatar-${tone}`,
        className,
      )}
      aria-label={name}
      title={name}
    >
      {initials(name)}
    </span>
  );
}
