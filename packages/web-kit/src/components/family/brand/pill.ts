import { cva, type VariantProps } from 'class-variance-authority';

/**
 * The family look's pill buttons and links (boards): gold for the one main act on a dark-green
 * band or a sign-in card, green for the main act on a white card, outline for its peers, quiet
 * (cream) for a soft one. 44 px tall at least; the gold one keeps dark-green text (≥ 4.5:1).
 */
export const pill = cva(
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 whitespace-nowrap ' +
    'rounded-full border px-5 text-sm font-bold no-underline transition-[filter,background-color] ' +
    'duration-150 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-[18px]',
  {
    variants: {
      tone: {
        gold: 'border-transparent bg-[image:var(--fam-gold-fill)] text-fam-on-gold ' +
          'shadow-[0_8px_20px_rgba(212,165,55,0.35)] hover:not-disabled:brightness-105',
        green: 'border-transparent bg-lapis-fill text-white shadow-[0_6px_14px_rgba(4,120,87,0.22)] ' +
          'hover:not-disabled:bg-[var(--lapis-hover)]',
        outline: 'border-rule bg-raised text-lapis hover:not-disabled:bg-sunk',
        quiet: 'border-transparent bg-sunk text-ink hover:not-disabled:bg-rule/50',
        onDark: 'border-fam-gold/55 bg-fam-gold/10 text-fam-gold hover:not-disabled:bg-fam-gold/20',
      },
      size: { md: '', lg: 'min-h-12 px-6 text-body' },
    },
    defaultVariants: { tone: 'green', size: 'md' },
  },
);

export type PillProps = VariantProps<typeof pill>;
