import type { HTMLAttributes } from "react";

export type BuildStatus = "needs-work" | "good" | "recommended" | "complete";

const statusLabels: Record<BuildStatus, string> = {
  "needs-work": "Needs work",
  good: "Good",
  recommended: "Recommended",
  complete: "Complete",
};

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: BuildStatus;
  label?: string;
}

export function StatusBadge({ status, label, className = "", ...props }: StatusBadgeProps) {
  return (
    <span className={["status-badge", `status-badge--${status}`, className].filter(Boolean).join(" ")} {...props}>
      <span className="status-badge__dot" aria-hidden="true" />
      {label ?? statusLabels[status]}
    </span>
  );
}
