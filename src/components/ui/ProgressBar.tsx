import type { HTMLAttributes } from "react";

export type ProgressTone = "accent" | "success" | "warning" | "danger";

export interface ProgressBarProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  value: number;
  max?: number;
  label?: string;
  tone?: ProgressTone;
  showValue?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  tone = "accent",
  showValue = false,
  className = "",
  ...props
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 100;
  const clampedValue = Math.min(Math.max(value, 0), safeMax);
  const percentage = Math.round((clampedValue / safeMax) * 100);

  return (
    <div className={["progress", className].filter(Boolean).join(" ")} {...props}>
      {(label || showValue) && (
        <div className="progress__meta">
          <span>{label}</span>
          {showValue && <span>{percentage}%</span>}
        </div>
      )}
      <div
        className="progress__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={clampedValue}
      >
        <span
          className={`progress__fill progress__fill--${tone}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
