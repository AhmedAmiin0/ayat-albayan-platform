import { settingSection, type AcademySettings } from '@ab/shared';
import { useId, type ReactNode } from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { CatalogueSection } from '@/features/notification-catalogue/CatalogueSection';
import { SalesAutoAssignSwitch } from '@/features/sales/SalesAutoAssignSwitch';
import { TemplateHealth } from '@/features/templates/TemplateHealth';
import { t } from '@/lib/i18n';
import { AutoMessagesSwitch } from './AutoMessagesSwitch';
import { FeedbackModeSwitch } from './FeedbackModeSwitch';
import { LinesCard } from './LinesCard';
import { MessagingSwitch } from './MessagingSwitch';
import { DangerFrame } from '../config/DangerFrame';
import { matchesSetting, matchesText } from '../config/settings-search';
import { useSettingsView } from '../config/settings-view';
import { RegistryField } from './RegistryField';
import { FORM_KEYS } from './settings-form';
import { sectionId, type SettingsSection } from './SettingsNav';
import type { SettingsFormState } from './use-settings-form';

/** One section of /admin/settings: its title, then its rows (scroll-margin keeps it under the pinned head). */
export function Section({ id, children }: { id: SettingsSection | 'custom' | 'integrations'; children: ReactNode }) {
  return (
    <section id={sectionId(id)} aria-labelledby={`${sectionId(id)}-title`} className="scroll-mt-24">
      <h2 id={`${sectionId(id)}-title`} className="mb-1 text-h4 font-bold">
        {id === 'custom' ? t.config.sections.custom : id === 'integrations' ? t.integrations.title : t.settings.sections[id]}
      </h2>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

/** The registry's form fields of one section, in registry order (nothing when it has none). */
export function SectionFields({ id, state }: { id: SettingsSection; state: SettingsFormState }) {
  const { query } = useSettingsView();
  const keys = FORM_KEYS.filter((k) => settingSection(k) === id && matchesSetting(k, query));
  if (keys.length === 0) return null;
  return (
    <div>
      {keys.map((k) => (
        <RegistryField key={k} settingKey={k} state={state} />
      ))}
    </div>
  );
}

/** Does the search match LinesCard's own text? */
export const linesMatch = (query: string): boolean =>
  matchesText(`${t.templates.settings.lines.title} ${t.templates.settings.lines.intro}`, query);

/** Does the search match «ماذا يُرسل ومتى» (its title or intro)? */
export const catalogueMatch = (query: string): boolean =>
  matchesText(`${t.notificationCatalogue.title} ${t.notificationCatalogue.intro}`, query);

/** Does the search match the template section's own text (its title, intro, «القوالب حسب الرقم»)? */
export const templatesMatch = (query: string): boolean => {
  const p = t.templates.perNumber;
  return matchesText(`${t.templates.title} ${t.templates.intro} ${p.title} ${p.sync}`, query);
};

/** «الرسائل والواتساب»: the switches that save on their own, the WhatsApp lines, «ماذا يُرسل ومتى», the timing fields, template health. */
export function MessagingSection({ settings, state }: { settings: AcademySettings; state: SettingsFormState }) {
  const templates = useId();
  const { query } = useSettingsView();
  const showSending = matchesSetting('messaging_enabled', query) || matchesSetting('crm_cutover_done', query);
  const showAuto = matchesSetting('auto_messages_enabled', query);
  const showFeedback = matchesSetting('feedback_mode', query);
  const showLines = linesMatch(query);
  const showCatalogue = catalogueMatch(query);
  const showTemplates = templatesMatch(query);
  const hasFields = FORM_KEYS.some((k) => settingSection(k) === 'messaging' && matchesSetting(k, query));
  const searching = query.trim() !== '';
  if (searching && !showSending && !showAuto && !showFeedback && !showLines && !showCatalogue && !hasFields && !showTemplates) return null;
  return (
    <Section id="messaging">
      {showSending && (
        <DangerFrame>
          <MessagingSwitch settings={settings} />
        </DangerFrame>
      )}
      {showAuto && (
        <DangerFrame>
          <AutoMessagesSwitch settings={settings} />
        </DangerFrame>
      )}
      {showFeedback && <FeedbackModeSwitch settings={settings} />}
      {showLines && <LinesCard />}
      {showCatalogue && <CatalogueSection />}
      <SectionFields id="messaging" state={state} />
      {showTemplates && (
        <div className="min-w-0">
          <TemplateHealth headingId={templates} />
        </div>
      )}
    </Section>
  );
}

/** Any section made only of registry fields: schedule, classroom, reports, accounts, uploads, academy. */
export function FieldsSection({ id, state }: { id: SettingsSection; state: SettingsFormState }) {
  const { query } = useSettingsView();
  if (query.trim() !== '' && !FORM_KEYS.some((k) => settingSection(k) === id && matchesSetting(k, query))) return null;
  return (
    <Section id={id}>
      <SectionFields id={id} state={state} />
    </Section>
  );
}

/** «فريق المبيعات» and «المظهر». */
export function SalesSection({ settings }: { settings: AcademySettings }) {
  const { query } = useSettingsView();
  if (!matchesSetting('sales_auto_assign', query)) return null;
  return (
    <Section id="sales">
      <SalesAutoAssignSwitch settings={settings} />
    </Section>
  );
}

export function AppearanceSection() {
  const { query } = useSettingsView();
  if (!matchesText(`${t.settings.theme} ${t.settings.themeHint}`, query)) return null;
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
