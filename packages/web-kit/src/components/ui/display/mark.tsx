import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';

// Logo mark (docs/07 §11): the academy's own emblem, the open Mushaf on its green rahle inside the
// gold eight-point star (docs/design/brand/logo-mark.png), exported on a transparent background by
// docs/design/brand/tools/build.mjs into packages/catalog/brand/, which every app serves at /brand/
// (vite-public.js). The emblem keeps its own ivory, so it reads
// on paper, on the green binding and in dark mode alike. Never recoloured, never struck.
const BASE = import.meta.env.BASE_URL;
const SRC = { large: `${BASE}brand/mark.png`, small: `${BASE}brand/mark-small.png` };
/** At this size and below the star frame is illegible: show the Mushaf on its rahle alone. */
const SMALL_MARK_MAX = 32;

export interface MarkProps {
  /** Rendered size in px (a square box, the emblem is contained); ≤ 32 switches to the Mushaf crop. */
  size?: number;
  /** Decorative next to the wordmark by default; `labelled` names it. */
  labelled?: boolean;
  className?: string;
}

export function Mark({ size = 42, labelled = false, className }: MarkProps) {
  const small = size <= SMALL_MARK_MAX;
  return (
    <img
      src={small ? SRC.small : SRC.large}
      width={size}
      height={size}
      alt={labelled ? t.app.brand : ''}
      aria-hidden={labelled ? undefined : true}
      data-mark={small ? 'small' : 'large'}
      draggable={false}
      className={cn('shrink-0 object-contain select-none', className)}
    />
  );
}

/** `collapse` shows only a 34px mark below 900px; the Latin wordmark is one step smaller to fit. */
export function Logo({ collapse = false, className }: { collapse?: boolean; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5 text-ink', className)}>
      <Mark size={42} className={cn(collapse && 'size-[34px] shell:size-[42px]')} />
      <span className={cn('leading-tight', collapse && 'hidden shell:block')}>
        <small className="block text-2xs leading-[1.3] text-ink-3">{t.app.academy}</small>
        <b className="block whitespace-nowrap font-display text-h3 leading-[1.35] ltr:text-h4">{t.app.brand}</b>
      </span>
    </span>
  );
}
