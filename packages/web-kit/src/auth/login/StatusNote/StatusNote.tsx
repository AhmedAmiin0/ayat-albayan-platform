import type { StatusNoteProps } from './StatusNote.types';

/** A calm note announced to screen readers. */
export function StatusNote({ children }: StatusNoteProps) {
  return (
    <p role="status" className="rounded-md bg-accent px-3 py-2.5 text-sm text-pretty text-ink">
      {children}
    </p>
  );
}
