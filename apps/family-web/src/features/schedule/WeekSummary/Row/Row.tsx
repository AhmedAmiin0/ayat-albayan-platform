import type { RowProps } from './Row.types';

export function Row({ term, children }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <dt className="text-sm text-ink-2">{term}</dt>
      <dd className="text-sm font-semibold tabular-nums">{children}</dd>
    </div>
  );
}
