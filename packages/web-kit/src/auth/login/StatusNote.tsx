import type { ReactNode } from 'react';

/** A calm note announced to screen readers. */
export function StatusNote({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-md bg-accent px-3 py-2.5 text-sm text-pretty text-ink">
      {children}
    </p>
  );
}
