import type { ReactNode } from 'react';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { cn } from '@/lib/utils';

/** Form-level inline alert (docs/07 §10): danger-soft, inset danger ring, struck glyph. */
export function FormAlert({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-ink shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--cinnabar)_35%,transparent)]',
        className,
      )}
    >
      <NuqtaGlyph shape="struck" className="mt-1 text-danger" />
      <span>{children}</span>
    </p>
  );
}
