import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// Logo mark (docs/07 §11, docs/design/logo.svg + logo-small.svg): the verse-end rosette holding an
// alef with madda. Gold on light, gold-on-cover on the binding. Never lapis, never struck.
const ROSETTE =
  'M32 7A7 7 0 0 1 44.5 10.35A7 7 0 0 1 53.65 19.5A7 7 0 0 1 57 32A7 7 0 0 1 53.65 44.5A7 7 0 0 1 44.5 53.65A7 7 0 0 1 32 57A7 7 0 0 1 19.5 53.65A7 7 0 0 1 10.35 44.5A7 7 0 0 1 7 32A7 7 0 0 1 10.35 19.5A7 7 0 0 1 19.5 10.35A7 7 0 0 1 32 7Z';
const LARGE = {
  alef: 'M31.9 24.8L33.3 24.2C34.2 26.2 34.3 29 34.2 32.2C34.1 37.2 33.2 42.6 32.4 46.6C32.2 47.7 31 47.8 30.8 46.8C30.3 42.6 30.2 37.6 30.4 32.4C30.6 29.2 31 26.6 31.9 24.8Z',
  madda: 'M38.6 17.4C37.6 18.7 36.2 19.1 34 18.9C31 18.6 28 18.3 26.5 18.9C25.6 19.4 25.2 20.6 25.4 22.1C26.1 21.5 26.8 21.3 27.6 21.2C29.6 21.1 31.6 21.7 34 21.7C36.5 21.7 38.1 20.1 38.6 17.4Z',
};
const SMALL = {
  alef: 'M31.2 24.6L33.8 23.5C35.1 25.6 35.4 28.8 35.3 32.2C35.2 37.4 34.1 42.8 33.2 46.8C32.8 48.5 30.8 48.6 30.4 46.9C29.7 42.6 29.5 37.6 29.7 32.4C29.9 28.8 30.3 26.4 31.2 24.6Z',
  madda: 'M40.2 16.8C39 18.6 37 19.2 34.2 18.9C30.8 18.6 27.4 18.2 25.6 19C24.4 19.6 23.8 21 24.2 22.8C24.9 22 25.8 21.6 26.9 21.5C29.4 21.4 31.8 22 34.2 22C37.4 22 39.6 20.2 40.2 16.8Z',
};

export interface MarkProps {
  /** Rendered size in px; 28 or less switches to the heavier small mark (no inner ring). */
  size?: number;
  /** Decorative next to the wordmark (default); `labelled` gives it role=img «آيات البيان». */
  labelled?: boolean;
  className?: string;
}

export function Mark({ size = 42, labelled = false, className }: MarkProps) {
  const small = size <= 28;
  const glyph = small ? SMALL : LARGE;
  const a11y = labelled
    ? { role: 'img', 'aria-label': t.app.brand }
    : { 'aria-hidden': true as const, focusable: false };
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      data-mark={small ? 'small' : 'large'}
      className={cn('shrink-0 text-gold', className)}
      {...a11y}
    >
      <path fill="none" stroke="currentColor" strokeWidth={small ? 4.5 : 2} d={ROSETTE} />
      {!small && <circle cx="32" cy="32" r="17.5" fill="none" stroke="currentColor" strokeWidth="1.25" />}
      <path fill="currentColor" d={glyph.alef} />
      <path fill="currentColor" d={glyph.madda} />
    </svg>
  );
}

/**
 * Mark + wordmark «أكاديمية / آيات البيان» (Amiri 700): sidebar brand, teacher top bar.
 * `collapse`: below 900px only a 34px mark (the compact admin top row).
 */
export function Logo({ collapse = false, className }: { collapse?: boolean; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5 text-ink', className)}>
      <Mark size={42} className={cn(collapse && 'size-[34px] shell:size-[42px]')} />
      <span className={cn('leading-tight', collapse && 'hidden shell:block')}>
        <small className="block text-2xs leading-[1.3] text-ink-3">{t.app.academy}</small>
        <b className="block whitespace-nowrap font-display text-h3 leading-[1.35]">{t.app.brand}</b>
      </span>
    </span>
  );
}
