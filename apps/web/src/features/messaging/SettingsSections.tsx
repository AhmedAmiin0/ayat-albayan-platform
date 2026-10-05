import { settingDef, type AcademySettings } from '@ab/shared';
import { useId, type ReactNode } from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SalesAutoAssignSwitch } from '@/features/sales/SalesAutoAssignSwitch';
import { TemplateHealth } from '@/features/templates/TemplateHealth';
import { t } from '@/lib/i18n';
import { AutoMessagesSwitch } from './AutoMessagesSwitch';
import { FeedbackModeSwitch } from './FeedbackModeSwitch';
import { MessagingSwitch } from './MessagingSwitch';
import { RegistryField } from './RegistryField';
import { FORM_KEYS } from './settings-form';
import { sectionId, type SettingsSection } from './SettingsNav';
import type { SettingsFormState } from './use-settings-form';

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

/** The registry's form fields of one section, in registry order (nothing when it has none). */
export function SectionFields({ id, state }: { id: SettingsSection; state: SettingsFormState }) {
  const keys = FORM_KEYS.filter((k) => settingDef(k).section === id);
  if (keys.length === 0) return null;
  return (
    <div>
      {keys.map((k) => (
        <RegistryField key={k} settingKey={k} state={state} />
      ))}
    </div>
  );
}

/** «الرسائل والواتساب»: the switches that save on their own, the timing fields, template health. */
export function MessagingSection({ settings, state }: { settings: AcademySettings; state: SettingsFormState }) {
  const templates = useId();
  return (
    <Section id="messaging">
      <MessagingSwitch settings={settings} />
      <AutoMessagesSwitch settings={settings} />
      <FeedbackModeSwitch settings={settings} />
      <SectionFields id="messaging" state={state} />
      <div className="min-w-0">
        <TemplateHealth headingId={templates} />
      </div>
    </Section>
  );
}

/** Any section made only of registry fields: schedule, classroom, reports, accounts, uploads, academy. */
export function FieldsSection({ id, state }: { id: SettingsSection; state: SettingsFormState }) {
  return (
    <Section id={id}>
      <SectionFields id={id} state={state} />
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
