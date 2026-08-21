import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  interactive?: boolean;
}

export function Card({ children, className = "", interactive = false, ...props }: CardProps) {
  const classes = ["ui-card", interactive ? "ui-card--interactive" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} {...props}>
      {children}
    </section>
  );
}
