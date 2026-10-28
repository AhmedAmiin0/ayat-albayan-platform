import { riyadhToday, usedBeforeMax } from '@ab/shared';
import { useState } from 'react';
import { useHolds } from '@/auth';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Stepper } from '@/finance';
import { Note } from '@/more';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

interface UsedBeforeFieldProps {
  /** Already clamped to the package (usedBefore). */
  value: number;
  /** The picked package's lessons (the quote's): the stepper stops one lesson per course day short of it (usedBeforeMax). */
  lessonsTotal: number;
  onChange: (value: number) => void;
}

/** The picked package's lessons: the quote's, 0 until it is known. */
export const quoteLessons = (quote: { lessons: number } | undefined): number => quote?.lessons ?? 0;

/** What is sent: the picked count, never past usedBeforeMax of the package now picked (it may have shrunk). */
export const usedBefore = (value: number, lessonsTotal: number): number => Math.min(value, usedBeforeMax(lessonsTotal));

/**
 * «حلقات مستخدمة من الباقة» (owner 2026-10-28): lessons a package that already started had before the
 * platform. − / + only (rule 6, never typed), 0 … usedBeforeMax (one lesson left per course day); counted as used, the course books the rest.
 */
export function UsedBeforeField({ value, lessonsTotal, onChange }: UsedBeforeFieldProps) {
  const { color } = useTheme();
  const m = t.salesMoney;
  return (
    <View style={{ gap: 6 }}>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink }}>{m.usedBefore}</AppText>
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

/**
 * The admin's subscribe (owner 2026-10-28): no «بدأ الاشتراك سابقًا» switch there, so the stepper is
 * asked only for a first day before the academy's (Riyadh) today, the day POST /subscriptions checks,
 * and before the form's own default day, and only with subscriptions.set_start_date (else 403).
 */
export function usePastUsedBefore({ startsOn, quote, now, today }: PastStartInput) {
  const [picked, setPicked] = useState(0);
  const canSet = useHolds('subscriptions.set_start_date');
  const lessonsTotal = quoteLessons(quote);
  const past = canSet && startsOn < riyadhToday(now) && startsOn < today;
  const value = past ? usedBefore(picked, lessonsTotal) : 0;
  const field = past ? <UsedBeforeField value={value} lessonsTotal={lessonsTotal} onChange={setPicked} /> : null;
  return { field, body: value > 0 ? { lessonsUsedBefore: value } : {} };
}
