import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';

const V = t.familyLook.verse;

/**
 * The gold-outlined arch with the ornamental verse (Amiri, the only place it is used) and its
 * reference, on the emerald hero and the sign-in panel. Decorative: hidden from screen readers.
 * `tall`: the sign-in panel's arch; else the hero's wide one.
 */
export function VerseArch({ tall = false, className }: { tall?: boolean; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative shrink-0 border border-fam-gold/60 bg-white/5 p-2',
        tall ? 'h-[300px] w-[340px] rounded-t-[170px] rounded-b-[18px]'
          : 'h-[150px] w-[300px] rounded-t-[150px] rounded-b-[18px]',
        className,
      )}
    >
      <div className={cn('flex h-full flex-col items-center justify-center gap-1.5 border',
        'border-fam-gold/30 rounded-b-xl', tall ? 'rounded-t-[162px] pt-16' : 'rounded-t-[142px]')}>
        <span className="text-[10px] text-fam-gold">◆</span>
        <span lang="ar" dir="rtl" className="font-verse text-[30px] leading-normal text-fam-gold">
          {V.text}
        </span>
        <span className="text-xs text-fam-hero-ink-2">{V.ref}</span>
      </div>
    </div>
  );
}
