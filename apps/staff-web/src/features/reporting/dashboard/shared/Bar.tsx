import { cn } from '@/lib/utils';

/**
 * The one bar mark of every dashboard chart (dataviz rules, docs/07): 10px thick, square at the
 * baseline (inline-start, the right edge in RTL), 4px rounded data end, one neutral ink token in
 * both themes; never gold, never a status colour. Decorative: the value is printed beside it and
 * the surrounding <table> is the accessible view.
 */
export function Bar({ value, max, className }: { value: number; max: number; className?: string }) {
  const share = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <span aria-hidden="true" data-share={share.toFixed(3)} className={cn('block h-2.5 min-w-12 flex-1', className)}>
      {share > 0 && <span className="block h-full rounded-e-[4px] bg-ink-3" style={{ inlineSize: `${share * 100}%` }} />}
    </span>
  );
}

/** Section title inside the work page: Amiri h4 (docs/07 §6 secondary panels). */
export const sectionTitle = 'font-display text-h4 font-bold text-ink text-balance';
