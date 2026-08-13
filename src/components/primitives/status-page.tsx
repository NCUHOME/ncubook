import type { ReactNode } from "react";

export interface StatusPageProps {
  icon: ReactNode;
  iconClassName?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function StatusPage({
  icon,
  iconClassName = "text-muted",
  title,
  description,
  actions,
}: StatusPageProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[760px] flex-col items-center justify-center bg-canvas px-s5 py-s7 text-center">
      <div
        className={`flex h-[64px] w-[64px] items-center justify-center rounded-round bg-surface-subtle ${iconClassName}`}
      >
        {icon}
      </div>
      <h1 className="mt-s5 font-display text-heading leading-heading font-semibold text-text">
        {title}
      </h1>
      <p className="mt-s3 max-w-[320px] font-body text-body leading-body text-muted">
        {description}
      </p>
      {actions ? <div className="mt-s6 flex flex-wrap items-center justify-center gap-s3">{actions}</div> : null}
    </main>
  );
}
