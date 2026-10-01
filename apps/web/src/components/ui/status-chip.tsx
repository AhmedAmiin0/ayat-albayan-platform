import type { Glyph, Tone } from '@ab/shared';
import { cn } from '@/lib/utils';
import { GradePips, NuqtaGlyph } from './nuqta-glyph';

// docs/07 §6 Status chip: nuqta glyph + ar.json word (+ tone colour). Literal class strings so
// Tailwind's scanner sees them. `bad` uses the danger utilities; there is no text-bad.
export const toneClass: Record<Tone, string> = {
  ok: 'bg-ok-soft text-ok border-ok/25',
  act: 'bg-act-soft text-act border-act/25',
  bad: 'bg-danger-soft text-danger border-danger/25',
  neutral: 'bg-neutral-soft text-ink-2 border-ink-2/25',
};

export interface StatusChipProps {
  tone: Tone;
  /** The ar.json word, e.g. t.enums.leadStatus[status]. Always shown. */
  label: string;
  /** Status shape; spread a status-style entry: `{...leadStatusStyle[s]}`. */
  glyph?: Glyph;
  /** Grades: 1..5 pips instead of a glyph (`{...gradeStyle[g]}`). */
  pips?: number;
  size?: 'md' | 'sm';
  className?: string;
}

export function StatusChip({ tone, label, glyph, pips, size = 'md', className }: StatusChipProps) {
  return (
    <span
      data-tone={tone}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border text-xs font-semibold leading-none',
        size === 'md' ? 'h-[26px] ps-[9px] pe-[11px]' : 'h-[22px] ps-[7px] pe-[9px]',
        toneClass[tone],
        className,
      )}
    >
      {pips === undefined ? <NuqtaGlyph shape={glyph ?? 'fill'} /> : <GradePips pips={pips} />}
      <span>{label}</span>
    </span>
  );
}
