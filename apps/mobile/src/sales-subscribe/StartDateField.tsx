import { daysBefore, SALES_START_BACK_DAYS } from '@ab/shared';
import { Switch, View } from 'react-native';
import { StartDayPicker } from '@/assistants/StartDayPicker';
import { dayLabel } from '@/booking/shared/slots';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { Section } from '@/more/Section';
import { StartDayPills } from '@/subscribe/SubscribeParts';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import type { StartDraft } from './start-date';

export interface StartDateFieldProps {
  /** Holds subscriptions.set_start_date. */
  canSet: boolean;
  /** The day chips from the academy's (Riyadh) today, the day the API checks against. */
  days: readonly string[];
  academyToday: string;
  draft: StartDraft;
  onChange: (patch: Partial<StartDraft>) => void;
  error: string | undefined;
}

/**
 * «يوم البدء» of the sales subscribe (docs/16 row 24). Without the permission only «تبدأ الباقة اليوم
 * (…)». With it the day chips and «بدأ الاشتراك سابقًا»: on, a past day picked with steppers (rule 6, never
 * typed) replaces the chips, from a year back up to today.
 */
export function StartDateField({ canSet, days, academyToday, draft, onChange, error }: StartDateFieldProps) {
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
        <StartDayPills days={days} today={academyToday} value={draft.day} onChange={(day) => onChange({ day })} />
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
        <StartDayPicker
          label={m.startedOn}
          day={draft.past}
          min={daysBefore(academyToday, SALES_START_BACK_DAYS)}
          max={academyToday}
          onChange={(past) => onChange({ past })}
        />
      ) : null}
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
