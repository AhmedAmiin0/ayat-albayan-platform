import { cn } from '@ab/web-kit/lib/utils';

const SIZE = {
  sm: 'size-11 text-lg',
  md: 'size-14 text-2xl',
  lg: 'size-[76px] text-[32px]',
} as const;

const TONE = {
  gold: 'bg-[image:var(--fam-gold-fill)] text-fam-on-gold',
  green: 'bg-[image:var(--fam-tile-green)] text-white',
  teal: 'bg-[image:var(--fam-tile-teal)] text-white',
} as const;

interface Props {
  name: string;
  size?: keyof typeof SIZE;
  tone?: keyof typeof TONE;
}

/** The first letter of a name in a round tile (boards: the child on the hero and the cards). */
export function Initial({ name, size = 'md', tone = 'gold' }: Props) {
  return (
    <span aria-hidden="true" className={cn('grid shrink-0 place-items-center rounded-full',
      'font-extrabold leading-none', SIZE[size], TONE[tone])}>
      {Array.from(name.trim())[0] ?? ''}
    </span>
  );
}
