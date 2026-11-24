import { type, useTheme, AppText, money } from '@ab/mobile-kit';

interface AmountTextProps {
  amount: number;
  currency: string;
  /** The total of a block reads bold; its parts regular. */
  strong?: boolean;
}

/** Tabular digits, amount isolated, its own currency on every row. */
export function AmountText({ amount, currency, strong = false }: AmountTextProps) {
  const { color } = useTheme();
  return (
    <AppText
      style={{ fontFamily: type.ui[strong ? 700 : 400], fontSize: type.size.sm, color: strong ? color.ink : color.ink2, fontVariant: ['tabular-nums'] }}
    >
      {money(amount, currency)}
    </AppText>
  );
}
