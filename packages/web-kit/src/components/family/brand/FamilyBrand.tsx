import { Mark } from '@ab/web-kit/components/ui/display/mark';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const B = t.familyLook.brand;

interface BrandLook {
  gap: string;
  tile: string;
  mark: number;
  name: string;
  tagline: string;
}

const FULL: BrandLook = {
  gap: 'gap-3',
  tile: 'size-12 rounded-[14px]',
  mark: 38,
  name: 'truncate text-body leading-snug sm:text-lg',
  tagline: 'truncate leading-normal',
};

/** The phone header: the English name and tagline wrap to two lines instead of «…». */
const COMPACT: BrandLook = {
  gap: 'gap-2.5',
  tile: 'size-10 rounded-xl',
  mark: 32,
  name: 'line-clamp-2 text-sm leading-tight',
  tagline: 'line-clamp-2 leading-tight',
};

/**
 * The header's lockup (boards, ayatalbayan.com): the academy mark (the kit Mark, logo-mark.png)
 * on its cream tile with a gold hairline, the academy's name and the gold tagline «رتّل بوعي،
 * واحفظ بإتقان» (gold on the dark-green header only). `compact`: the phone header's smaller tile.
 */
export function FamilyBrand({ compact = false }: { compact?: boolean }) {
  const look = compact ? COMPACT : FULL;
  return (
    <span className={`flex min-w-0 items-center text-white ${look.gap}`}>
      <span className={`grid shrink-0 place-items-center border border-[#d4a537] bg-[#fdfbf3]
        shadow-[0_6px_16px_rgba(0,0,0,0.25)] ${look.tile}`}>
        <Mark size={look.mark} />
      </span>
      <span className="grid min-w-0">
        <span className={`font-extrabold ${look.name}`}>{B.name}</span>
        <span className={`text-2xs font-semibold text-fam-gold ${look.tagline}`}>
          {B.tagline}
        </span>
      </span>
    </span>
  );
}
