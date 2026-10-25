import type { ReactNode } from 'react';
import { isolateLtr } from '../display/ltr';
import { NuqtaGlyph } from '../display/nuqta-glyph';
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
      <span>{typeof children === 'string' ? isolateLtr(children) : children}</span>
    </p>
  );
}
