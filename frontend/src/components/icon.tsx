import type { SVGProps } from "react";

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "path"> {
  path: string;
  size?: number;
}

export function Icon({ path, size = 20, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
}
