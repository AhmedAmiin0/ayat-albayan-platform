import { Mark, t, cn } from '@ab/web-kit';

/** The emblem on the deep-green tile (brandTile, both themes) and the family app's name. */
export function Brand({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <p className={className}>
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-brand-tile">
        <Mark size={28} />
      </span>
      <span
        lang="en"
        dir="ltr"
        className={cn(
          'whitespace-nowrap font-display text-body font-bold text-ink',
          compact && 'max-sm:sr-only',
        )}
      >
        {t.familyApp.signIn.wordmark}
      </span>
    </p>
  );
}
