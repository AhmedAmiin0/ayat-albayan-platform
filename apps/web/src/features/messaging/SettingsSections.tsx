import { CURRENCY_ISOS, type AcademySettings } from '@ab/shared';
import { useId, type ReactNode } from 'react';
import { Select } from '@/components/ui/select';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SalesAutoAssignSwitch } from '@/features/sales/SalesAutoAssignSwitch';
import { TemplateHealth } from '@/features/templates/TemplateHealth';
import { t } from '@/lib/i18n';
import { AutoMessagesSwitch } from './AutoMessagesSwitch';
import { MessagingSwitch } from './MessagingSwitch';
import { CheckField, NumberField, SettingRow } from './SettingsFields';
import { sectionId, type SettingsSection } from './SettingsNav';
import type { SettingsFormState } from './use-settings-form';

const msg = t.templates.settings;
const h = t.settings.hints;

/** One section of /admin/settings: its title, then its rows (scroll-margin keeps it under the pinned head). */
export function Section({ id, children }: { id: SettingsSection; children: ReactNode }) {
  return (
    <section id={sectionId(id)} aria-labelledby={`${sectionId(id)}-title`} className="scroll-mt-24">
      <h2 id={`${sectionId(id)}-title`} className="mb-1 text-h4 font-bold">
        {t.settings.sections[id]}
      </h2>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

/** «الرسائل والواتساب»: sending, automatic messages, template health, reminder and follow-up timing. */
export function MessagingSection({ settings, state }: { settings: AcademySettings; state: SettingsFormState }) {
  const templates = useId();
  const { form, errors, set } = state;
  return (
    <Section id="messaging">
      <MessagingSwitch settings={settings} />
      <AutoMessagesSwitch settings={settings} />
      <div>
        <NumberField label={msg.reminderMinutesBefore} hint={h.reminderMinutesBefore} value={form.reminderMinutesBefore} error={errors.reminderMinutesBefore} onChange={(v) => set({ reminderMinutesBefore: v })} />
        <CheckField label={msg.reminder24hEnabled} hint={msg.reminder24hHint} checked={form.reminder24hEnabled} onChange={(v) => set({ reminder24hEnabled: v })} />
        <NumberField list label={msg.followUpHours} hint={msg.followUpHoursHint} value={form.followUpHours} error={errors.followUpHours} onChange={(v) => set({ followUpHours: v })} />
      </div>
      <div className="min-w-0">
        <TemplateHealth headingId={templates} />
      </div>
    </Section>
  );
}

/** «الجدول والحلقات»: the booking horizon and late cancellation. */
export function ScheduleSection({ state: { form, errors, set } }: { state: SettingsFormState }) {
  return (
    <Section id="schedule">
      <div>
        <NumberField label={t.settings.bookingHorizonWeeks} hint={h.bookingHorizonWeeks} value={form.bookingHorizonWeeks} error={errors.bookingHorizonWeeks} onChange={(v) => set({ bookingHorizonWeeks: v })} />
        <CheckField label={t.settings.lateCancel} hint={t.settings.lateCancelHint} checked={form.lateCancelOn} onChange={(v) => set({ lateCancelOn: v })} />
        <NumberField label={t.settings.lateCancelHours} disabled={!form.lateCancelOn} value={form.lateCancelHours} error={errors.lateCancelHours} onChange={(v) => set({ lateCancelHours: v })} />
      </div>
    </Section>
  );
}

/** «التقارير»: how long a teacher may still edit a sent report. */
export function ReportsSection({ state: { form, errors, set } }: { state: SettingsFormState }) {
  return (
    <Section id="reports">
      <div>
        <NumberField label={t.settings.reportTeacherEditHours} hint={h.reportTeacherEditHours} value={form.reportTeacherEditHours} error={errors.reportTeacherEditHours} onChange={(v) => set({ reportTeacherEditHours: v })} />
      </div>
    </Section>
  );
}

/** «الحسابات والدفعات»: dashboard currency, renewal alerts, unpaid flags and payout rules. */
export function AccountsSection({ state: { form, errors, set } }: { state: SettingsFormState }) {
  return (
    <Section id="accounts">
      <div>
        <SettingRow label={t.settings.reportingCurrency} hint={h.reportingCurrency} error={errors.reportingCurrency}>
          {(p) => (
            <Select {...p} className="w-[140px]" value={form.reportingCurrency} onChange={(e) => set({ reportingCurrency: e.target.value })}>
              {/* A stored code outside the list stays selectable, so saving never changes it. */}
              {[...new Set([form.reportingCurrency, ...CURRENCY_ISOS])].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          )}
        </SettingRow>
        <NumberField label={t.settings.renewalAlertRemaining} hint={h.renewalAlertRemaining} value={form.renewalAlertRemaining} error={errors.renewalAlertRemaining} onChange={(v) => set({ renewalAlertRemaining: v })} />
        <CheckField label={t.settings.flagFutureLessonsWhenUnpaid} hint={h.flagFutureLessonsWhenUnpaid} checked={form.flagFutureLessonsWhenUnpaid} onChange={(v) => set({ flagFutureLessonsWhenUnpaid: v })} />
        <CheckField label={t.settings.payoutCountLate} hint={h.payoutCountLate} checked={form.payoutCountLate} onChange={(v) => set({ payoutCountLate: v })} />
        <CheckField label={t.settings.payoutCountNoShow} hint={h.payoutCountNoShow} checked={form.payoutCountNoShow} onChange={(v) => set({ payoutCountNoShow: v })} />
        <CheckField label={t.settings.payoutCountTrials} checked={form.payoutCountTrials} onChange={(v) => set({ payoutCountTrials: v })} />
      </div>
    </Section>
  );
}

/** «المساعدون والمبيعات» and «المظهر». */
export function SalesSection({ settings }: { settings: AcademySettings }) {
  return (
    <Section id="sales">
      <SalesAutoAssignSwitch settings={settings} />
    </Section>
  );
}

export function AppearanceSection() {
  return (
    <Section id="appearance">
      <div className="grid gap-x-6 gap-y-2 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="grid gap-0.5">
          <p className="text-sm font-semibold">{t.settings.theme}</p>
          <p className="text-xs text-ink-3">{t.settings.themeHint}</p>
        </div>
        <ThemeToggle />
      </div>
    </Section>
  );
}
