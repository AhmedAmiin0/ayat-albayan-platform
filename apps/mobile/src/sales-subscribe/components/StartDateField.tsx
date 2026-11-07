import { daysBefore, SALES_START_BACK_DAYS } from '@ab/shared';
import { Switch, View } from 'react-native';
import { dayLabel } from '@/booking';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Section } from '@/core/ui/surface/Section';
import { DatePickerField } from '@/core/ui/form/date-picker';
import { NoCommissionNote, UsedBeforeField } from '@/subscribe';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { type StartDraft, usedBeforeOf } from '@/sales-subscribe/lib/start-date';

interface StartDateFieldProps {
  /** Holds subscriptions.set_start_date. */
  canSet: boolean;
  /** The days offered from the academy's (Riyadh) today (the API's floor): the date dialog's bounds. */
  days: readonly string[];
  academyToday: string;
  draft: StartDraft;
  onChange: (patch: Partial<StartDraft>) => void;
  error: string | undefined;
  /** The picked package's lessons (the quote's): «حلقات مستخدمة من الباقة» stops at usedBeforeMax (every lesson but one). */
  lessonsTotal: number;
}

/** «بدأ الاشتراك سابقًا»: off again resets the used lessons to 0. */
function StartedSwitch({ on, onChange }: { on: boolean; onChange: StartDateFieldProps['onChange'] }) {
  const { color } = useTheme();
  const m = t.salesMoney;
  const row = { minHeight: 44, alignItems: 'center', justifyContent: 'space-between', gap: 12 } as const;
  return (
    <View style={{ ...row, flexDirection: 'row' }}>
      <AppText style={{ flexShrink: 1, fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink }}>
        {m.alreadyStarted}
      </AppText>
      <Switch
        accessibilityLabel={m.alreadyStarted}
        value={on}
        onValueChange={(alreadyStarted) => onChange(alreadyStarted ? { alreadyStarted } : { alreadyStarted, usedBefore: 0 })}
      />
    </View>
  );
}

/**
 * «يوم البدء» of the sales subscribe (docs/16 row 24). Without the permission only «تبدأ الباقة اليوم
 * (…)». With it the day on Expo's date dialog (rule 6, never typed; owner 2026-11-07) from the
 * academy's today, and «بدأ الاشتراك سابقًا»: on, a past day on the same dialog replaces it, from a
 * year back up to today, with «حلقات مستخدمة من الباقة» (owner 2026-10-28); off again resets it to 0.
 */
export function StartDateField({ canSet, days, academyToday, draft, onChange, error, lessonsTotal }: StartDateFieldProps) {
  const m = t.salesMoney;
  if (!canSet) {
    return (
      <Section title={m.startsOn}>
        <Note>{m.startsOnDefault.replace('{date}', dayLabel(new Date(`${academyToday}T12:00:00Z`), 'UTC'))}</Note>
      </Section>
    );
  }
  return (
    <View style={{ gap: 12 }}>
      {draft.alreadyStarted ? null : (
        <DatePickerField
          label={m.startsOn}
          day={draft.day}
          range={{ min: academyToday, max: days.at(-1) ?? academyToday }}
          onChange={(day) => onChange({ day })}
          testID="start-day-open"
        />
      )}
      <StartedSwitch on={draft.alreadyStarted} onChange={onChange} />
      <Note>{m.alreadyStartedHint}</Note>
      {draft.alreadyStarted ? (
        <>
          <DatePickerField
            label={m.startedOn}
            day={draft.past}
            range={{ min: daysBefore(academyToday, SALES_START_BACK_DAYS), max: academyToday }}
            onChange={(past) => onChange({ past })}
          />
          <NoCommissionNote startsOn={draft.past} usedBefore={usedBeforeOf(draft, lessonsTotal)} now={new Date()} />
          <UsedBeforeField
            value={usedBeforeOf(draft, lessonsTotal)}
            lessonsTotal={lessonsTotal}
            onChange={(usedBefore) => onChange({ usedBefore })}
          />
        </>
      ) : null}
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
