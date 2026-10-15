import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Field } from '@/ui/Field';
import { FilterPills } from '@/ui/FilterPills';
import { ErrorLine } from '@/inbox/ErrorLine';
import type { SettingsErrors, SettingsForm } from './settings-form';

export interface SettingsFieldsProps {
  form: SettingsForm;
  errors: SettingsErrors;
  set: <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => void;
}

type Text = Exclude<keyof SettingsForm, 'lateCancelOn'>;

/** One typed box with its hint and, below it, the validation line (ours or the API's). */
function Typed({
  name,
  label,
  hint,
  keyboard = 'number-pad',
  ...p
}: SettingsFieldsProps & {
  name: Text;
  label: string;
  hint?: string;
  keyboard?: 'number-pad' | 'numbers-and-punctuation' | 'default';
}) {
  return (
    <View style={{ gap: 6 }}>
      <Field
        label={label}
        value={p.form[name]}
        keyboardType={keyboard}
        onChangeText={(v) => p.set(name, v)}
        ltr
      />
      {p.errors[name] ? <ErrorLine message={p.errors[name]} /> : hint ? <Note>{hint}</Note> : null}
    </View>
  );
}

/** The seven editable settings: late cancel (switch + hours), horizon, follow-up, renewal, expiry days, edit window, currency. */
export function SettingsFields(p: SettingsFieldsProps) {
  const { form, set } = p;
  const s = t.settings;
  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 8 }}>
        <Note>{s.lateCancel}</Note>
        <FilterPills
          role="radiogroup"
          accessibilityLabel={s.lateCancel}
          value={form.lateCancelOn ? 'on' : 'off'}
          onChange={(v) => set('lateCancelOn', v === 'on')}
          items={[
            { value: 'on', label: t.mobileAdmin.settings.lateCancelOn },
            { value: 'off', label: t.mobileAdmin.settings.lateCancelOff },
          ]}
        />
        {form.lateCancelOn ? (
          <Typed {...p} name="lateCancelHours" label={s.lateCancelHours} />
        ) : (
          <Note>{s.lateCancelHint}</Note>
        )}
      </View>
      <Typed
        {...p}
        name="bookingHorizonWeeks"
        label={s.bookingHorizonWeeks}
        hint={s.hints.bookingHorizonWeeks}
      />
      <Typed
        {...p}
        name="followUpHours"
        label={t.mobileAdmin.settings.followUpHours}
        hint={t.mobileAdmin.settings.followUpHint}
        keyboard="numbers-and-punctuation"
      />
      <Typed
        {...p}
        name="renewalAlertRemaining"
        label={s.renewalAlertRemaining}
        hint={s.hints.renewalAlertRemaining}
      />
      <Typed {...p} name="subscriptionExpiryDays" label={s.subscriptionExpiryDays} hint={s.hints.subscriptionExpiryDays} />
      <Typed
        {...p}
        name="reportTeacherEditHours"
        label={s.reportTeacherEditHours}
        hint={s.hints.reportTeacherEditHours}
      />
      <Typed
        {...p}
        name="reportingCurrency"
        label={s.reportingCurrency}
        hint={t.mobileAdmin.settings.currencyHint}
        keyboard="default"
      />
    </View>
  );
}
