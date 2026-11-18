import { Icon, type IconName } from '@ab/web-kit/components/ui/display/icon';
import { cn } from '@ab/web-kit/lib/utils';

export type TileTone = 'green' | 'gold' | 'teal' | 'rose';

const FILL: Record<TileTone, string> = {
  green: 'bg-[image:var(--fam-tile-green)]',
  gold: 'bg-[image:var(--fam-tile-gold)]',
  teal: 'bg-[image:var(--fam-tile-teal)]',
  rose: 'bg-[image:var(--fam-tile-rose)]',
};

const SIZE = { md: 'size-11 rounded-[13px] [&_svg]:size-5', lg: 'size-14 rounded-2xl [&_svg]:size-6' };

interface Props {
  icon: IconName;
  tone?: TileTone;
  size?: keyof typeof SIZE;
}

/** The gradient icon tile beside a card title (boards): white glyph, decorative. */
export function IconTile({ icon, tone = 'green', size = 'md' }: Props) {
  return (
    <span aria-hidden="true" className={cn('grid shrink-0 place-items-center text-white',
      'shadow-[0_6px_14px_rgba(12,42,30,0.18)]', FILL[tone], SIZE[size])}>
      <Icon name={icon} />
    </span>
  );
}
