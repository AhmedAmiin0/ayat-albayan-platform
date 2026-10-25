import { cn } from '@/lib/utils';

// Verse-end rosette (docs/07 §5, motif-rosette-number.svg). It ONLY ever holds a number: the
// current page in the pager, a section number. Never a status, a bullet or struck through.
const RING =
  'M8 1.6A2.5 2.5 0 0 1 12.53 3.47A2.5 2.5 0 0 1 14.4 8A2.5 2.5 0 0 1 12.53 12.53A2.5 2.5 0 0 1 8 14.4A2.5 2.5 0 0 1 3.47 12.53A2.5 2.5 0 0 1 1.6 8A2.5 2.5 0 0 1 3.47 3.47A2.5 2.5 0 0 1 8 1.6Z';

export function Rosette({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('relative grid size-10 place-items-center', className)}>
      <svg viewBox="0 0 16 16" aria-hidden="true" className="absolute inset-0 size-full text-gold">
        <path fill="none" stroke="currentColor" strokeWidth="1.1" vectorEffect="non-scaling-stroke" d={RING} />
        <circle cx="8" cy="8" r="4.6" fill="none" stroke="currentColor" strokeWidth=".8" vectorEffect="non-scaling-stroke" />
      </svg>
      <b className="relative font-bold tabular-nums text-ink">{value}</b>
    </span>
  );
}
