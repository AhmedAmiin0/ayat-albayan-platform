import { CURRENCY_ISOS } from '@ab/shared';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { t } from '@/lib/i18n';
import { CheckField, NumberField } from './SettingsFields';
import type { SettingsErrors, SettingsForm } from './settings-form';

export interface GroupProps {
  form: SettingsForm;
  errors: SettingsErrors;
  set: (patch: Partial<SettingsForm>) => void;
}

const legend = 'mb-3 border-b-[3px] border-double border-gold pb-1.5 font-semibold';
const grid = 'grid gap-x-6 gap-y-4 sm:grid-cols-2';
const msg = t.templates.settings;

/** R-MSG-02 reminder timing and R-LEAD-05 follow-up hours (docs/12 §7). */
export function MessageGroup({ form, errors, set }: GroupProps) {
  return (
    <fieldset>
      <legend className={legend}>{t.settings.groups.messages}</legend>
      <div className={grid}>
        <NumberField
          label={msg.reminderMinutesBefore}
          value={form.reminderMinutesBefore}
          error={errors.reminderMinutesBefore}
          onChange={(v) => set({ reminderMinutesBefore: v })}
        />
        <NumberField
          list
          label={msg.followUpHours}
          hint={msg.followUpHoursHint}
          value={form.followUpHours}
          error={errors.followUpHours}
          onChange={(v) => set({ followUpHours: v })}
        />
        <CheckField
          label={msg.reminder24hEnabled}
          hint={msg.reminder24hHint}
          checked={form.reminder24hEnabled}
          onChange={(v) => set({ reminder24hEnabled: v })}
        />
      </div>
    </fieldset>
  );
}

/** Cancellation, the booking horizon (R-SCH-07, R-SCH-02) and the report edit window (R-REP-02). */
export function LessonGroup({ form, errors, set }: GroupProps) {
  return (
    <fieldset>
      <legend className={legend}>{t.settings.groups.lessons}</legend>
      <div className={grid}>
        <div className="grid content-start gap-2">
          <CheckField label={t.settings.lateCancel} hint={t.settings.lateCancelHint} checked={form.lateCancelOn} onChange={(v) => set({ lateCancelOn: v })} />
          <NumberField
            label={t.settings.lateCancelHours}
            disabled={!form.lateCancelOn}
            value={form.lateCancelHours}
            error={errors.lateCancelHours}
            onChange={(v) => set({ lateCancelHours: v })}
          />
        </div>
        <NumberField
          label={t.settings.bookingHorizonWeeks}
          value={form.bookingHorizonWeeks}
          error={errors.bookingHorizonWeeks}
          onChange={(v) => set({ bookingHorizonWeeks: v })}
        />
        <NumberField
          label={t.settings.reportTeacherEditHours}
          value={form.reportTeacherEditHours}
          error={errors.reportTeacherEditHours}
          onChange={(v) => set({ reportTeacherEditHours: v })}
        />
      </div>
    </fieldset>
  );
}

/** Renewal alerts and unpaid flags (R-SUB-02), payout rules (R-PAY-02), dashboard currency. */
export function MoneyGroup({ form, errors, set }: GroupProps) {
  return (
    <fieldset>
      <legend className={legend}>{t.settings.groups.money}</legend>
      <div className={grid}>
        <NumberField
          label={t.settings.renewalAlertRemaining}
          value={form.renewalAlertRemaining}
          error={errors.renewalAlertRemaining}
          onChange={(v) => set({ renewalAlertRemaining: v })}
        />
        <Field label={t.settings.reportingCurrency} error={errors.reportingCurrency}>
          {(p) => (
            <Select {...p} className="max-w-[180px]" value={form.reportingCurrency} onChange={(e) => set({ reportingCurrency: e.target.value })}>
              {/* A stored code outside the list stays selectable, so saving never changes it. */}
              {[...new Set([form.reportingCurrency, ...CURRENCY_ISOS])].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <CheckField label={t.settings.flagFutureLessonsWhenUnpaid} checked={form.flagFutureLessonsWhenUnpaid} onChange={(v) => set({ flagFutureLessonsWhenUnpaid: v })} />
        <CheckField label={t.settings.payoutCountLate} checked={form.payoutCountLate} onChange={(v) => set({ payoutCountLate: v })} />
        <CheckField label={t.settings.payoutCountNoShow} checked={form.payoutCountNoShow} onChange={(v) => set({ payoutCountNoShow: v })} />
      </div>
    </fieldset>
  );
}
