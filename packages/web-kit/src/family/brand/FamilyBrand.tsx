import { Mark } from '@ab/web-kit/components/ui/display/mark';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const B = t.familyLook.brand;

/**
 * The header's lockup (boards, ayatalbayan.com): the academy mark (the kit Mark, logo-mark.png)
 * on its cream tile with a gold hairline, the academy's name and the gold tagline «رتّل بوعي،
 * واحفظ بإتقان» (gold on the dark-green header only). `compact`: the phone header's smaller tile.
 */
export function FamilyBrand({ compact = false }: { compact?: boolean }) {
  const tile = compact ? 'size-10 rounded-xl' : 'size-12 rounded-[14px]';
  return (
    <span className="flex min-w-0 items-center gap-3 text-white">
      <span className={`grid shrink-0 place-items-center border border-[#d4a537] bg-[#fdfbf3]
        shadow-[0_6px_16px_rgba(0,0,0,0.25)] ${tile}`}>
        <Mark size={compact ? 32 : 38} />
      </span>
      <span className="grid min-w-0">
        <span className="truncate text-body font-extrabold leading-snug sm:text-lg">{B.name}</span>
        <span className="truncate text-2xs font-semibold leading-normal text-fam-gold">
          {B.tagline}
        </span>
      </span>
    </span>
  );
}
