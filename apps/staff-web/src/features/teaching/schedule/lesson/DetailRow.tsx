import type { ReactNode } from 'react';

/** One «label: value» pair of a lesson's details list (the admin drawer, sales' read-only drawer). */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
