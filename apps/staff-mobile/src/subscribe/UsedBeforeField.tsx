import { usedBeforeMax } from '@ab/shared';
import { riyadhToday } from '@ab/time';
import { useState } from 'react';
import { useHolds, t, type, useTheme, AppText } from '@ab/mobile-kit';
import { View } from 'react-native';
import { Stepper } from '@/finance';
import { Note } from '@/more';

interface UsedBeforeFieldProps {
  /** Already clamped to the package (usedBefore). */
  value: number;
  /** The picked package's lessons (the quote's): the stepper stops one lesson short of it (usedBeforeMax). */
  lessonsTotal: number;
  onChange: (value: number) => void;
}

/** The picked package's lessons: the quote's, 0 until it is known. */
export const quoteLessons = (quote: { lessons: number } | undefined): number => quote?.lessons ?? 0;

/** What is sent: the picked count, never past usedBeforeMax of the package now picked (it may have shrunk). */
export const usedBefore = (value: number, lessonsTotal: number): number =>
  Math.min(value, usedBeforeMax(lessonsTotal));

/** Lessons used before the platform, steppers only (rule 6), 0 to every lesson but one. */
export function UsedBeforeField({ value, lessonsTotal, onChange }: UsedBeforeFieldProps) {
  const { color } = useTheme();
  const m = t.salesMoney;
  return (
    <View style={{ gap: 6 }}>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink }}>
        {m.usedBefore}
      </AppText>
      <Stepper
        label={m.usedBefore}
        value={value}
        min={0}
        max={usedBeforeMax(lessonsTotal)}
        onChange={onChange}
        names={{ less: m.usedBeforeLess, more: m.usedBeforeMore }}
      />
      <Note>{m.usedBeforeHint}</Note>
    </View>
  );
}

interface PastStartInput {
  startsOn: string;
  /** The quote of the picked package (its lessons), while known. */
  quote: { lessons: number } | undefined;
  now: Date;
  /** The form's default first day (the family's today): never «past» by itself, even west of Riyadh. */
  today: string;
}

/** Asked only for a first day before Riyadh today and with subscriptions.set_start_date. */
export function usePastUsedBefore({ startsOn, quote, now, today }: PastStartInput) {
  const [picked, setPicked] = useState(0);
  const canSet = useHolds('subscriptions.set_start_date');
  const lessonsTotal = quoteLessons(quote);
  // academy day (docs/34 b): «used before» is cut at the academy's today.
  const past = canSet && startsOn < riyadhToday(now) && startsOn < today;
  const value = past ? usedBefore(picked, lessonsTotal) : 0;
  const field = past ? (
    <UsedBeforeField value={value} lessonsTotal={lessonsTotal} onChange={setPicked} />
  ) : null;
  return { field, body: value > 0 ? { lessonsUsedBefore: value } : {} };
}
