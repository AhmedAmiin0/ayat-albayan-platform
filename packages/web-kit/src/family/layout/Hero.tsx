import type { ReactNode } from 'react';
import { cn } from '@ab/web-kit/lib/utils';
import { StarPattern } from '@ab/web-kit/family/ornament/StarPattern';

interface Props {
  children: ReactNode;
  /** Labels the band (its heading's id). */
  labelledBy?: string;
  className?: string;
}

/**
 * The emerald band under the header (boards: every page's top): the deep-green gradient, the
 * faint star lattice, a soft gold glow at the top end, and the page's own content on the
 * 1120 px column. White and mint text only on it; gold text is allowed here (dark green).
 */
export function Hero({ children, labelledBy, className }: Props) {
  return (
    <section
      aria-labelledby={labelledBy}
      className="relative overflow-hidden bg-[image:var(--fam-hero)] text-fam-hero-ink"
    >
      <StarPattern />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -end-20 -top-30 size-[420px] rounded-full
          bg-[radial-gradient(circle,rgba(233,196,90,0.16),transparent_65%)]"
      />
      <div className={cn('relative mx-auto w-full max-w-[1120px] px-4 py-6 sm:py-8', className)}>
        {children}
      </div>
    </section>
  );
}

/** A page's title and line on the band (account, reports, schedule, alerts). */
export function HeroTitle({ id, title, line }: { id: string; title: string; line?: string }) {
  return (
    <div className="grid gap-1">
      <h1 id={id} className="text-[28px] font-extrabold leading-snug sm:text-[34px]">{title}</h1>
      {line && <p className="text-sm text-fam-hero-ink-2 sm:text-body">{line}</p>}
    </div>
  );
}
