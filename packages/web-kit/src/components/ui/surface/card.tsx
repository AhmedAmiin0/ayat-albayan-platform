import { Slot } from '@radix-ui/react-slot';
import type { HTMLAttributes } from 'react';
import { cn } from '#/lib/index.ts';

// docs/07 §6 Card (audit 2026-11-19, extraction 1): the one raised surface on the margin, a 1px
// rule, a 12px radius and the page hairline shadow. Padding varies by use, so it comes in
// `className`. Never a card in a card: a part inside one is a divider or a sunk block.

export const cardClass = 'rounded-lg border border-rule bg-raised shadow-page';

/** A card the whole of which is one tap: pressed feedback (motion.css) and a hover edge. */
export const pressableClass =
  'ab-press cursor-pointer text-start hover:border-rule-strong hover:bg-sunk/60 ' +
  'transition-[transform,background-color,border-color] duration-(--duration-press) ease-ink';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Render the child element (an <li>, <article>, <Link>, <button>) with the card's look. */
  asChild?: boolean;
  /** The card is a link or a button: it sinks a little when pressed. */
  pressable?: boolean;
}

export function Card({ asChild = false, pressable = false, className, ...props }: CardProps) {
  const Comp = asChild ? Slot : 'div';
  return <Comp className={cn(cardClass, pressable && pressableClass, className)} {...props} />;
}
