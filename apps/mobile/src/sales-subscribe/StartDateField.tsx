import { Switch, View } from 'react-native';
import { dayLabel } from '@/booking/slots';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Section } from '@/more/Section';
import { StartDayPills } from '@/subscribe/SubscribeParts';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Field } from '@/ui/Field';
import type { StartDraft } from './start-date';

export interface StartDateFieldProps {
  /** Holds subscriptions.set_start_date. */
  canSet: boolean;
  /** The family's day chips and its today; `academyToday` (Riyadh) is the default day said. */
  days: readonly string[];
  today: string;
  academyToday: string;
  draft: StartDraft;
  onChange: (patch: Partial<StartDraft>) => void;
  error: string | undefined;
}

/**
 * «يوم البدء» of the sales subscribe (docs/16 row 24). Without the permission only «تبدأ الباقة اليوم
 * (…)». With it the day chips and «بدأ الاشتراك سابقًا»: on, a typed day (YYYY-MM-DD) replaces the chips.
 */
export function StartDateField({ canSet, days, today, academyToday, draft, onChange, error }: StartDateFieldProps) {
  const { color } = useTheme();
  const m = t.salesMoney;
  if (!canSet) {
    return (
      <Section title={m.startsOn}>
        <Note>{m.startsOnDefault.replace('{date}', dayLabel(new Date(`${academyToday}T12:00:00Z`)))}</Note>
      </Section>
    );
  }
  return (
    <View style={{ gap: 12 }}>
      {draft.alreadyStarted ? null : (
        <StartDayPills days={days} today={today} value={draft.day} onChange={(day) => onChange({ day })} />
      )}
      <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <AppText style={{ flexShrink: 1, fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink }}>
          {m.alreadyStarted}
        </AppText>
        <Switch
          accessibilityLabel={m.alreadyStarted}
          value={draft.alreadyStarted}
          onValueChange={(alreadyStarted) => onChange({ alreadyStarted })}
        />
      </View>
      <Note>{m.alreadyStartedHint}</Note>
      {draft.alreadyStarted ? (
        <Field
          label={m.startedOn}
          value={draft.typed}
          onChangeText={(typed) => onChange({ typed })}
          ltr
          placeholder={academyToday}
          keyboardType="numbers-and-punctuation"
          autoCorrect={false}
          maxLength={10}
        />
      ) : null}
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
