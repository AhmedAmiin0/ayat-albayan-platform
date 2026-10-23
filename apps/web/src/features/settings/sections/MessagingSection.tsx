import { settingSection, type AcademySettings } from '@ab/shared';
import { useId } from 'react';
import { DangerFrame } from '@/components/settings/DangerFrame';
import { Section } from '@/components/settings/Section';
import { matchesSetting } from '@/components/settings/settings-search';
import { useSettingsView } from '@/components/settings/settings-view';
import { AutoMessagesSwitch } from '@/features/messaging/AutoMessagesSwitch';
import { FeedbackModeSwitch } from '@/features/messaging/FeedbackModeSwitch';
import { linesMatch } from '@/features/messaging/lines-match';
import { LinesCard } from '@/features/messaging/LinesCard';
import { MessagingSwitch } from '@/features/messaging/MessagingSwitch';
import { catalogueMatch } from '@/features/notification-catalogue/catalogue-match';
import { CatalogueSection } from '@/features/notification-catalogue/CatalogueSection';
import { TemplateHealth } from '@/features/templates/TemplateHealth';
import { templatesMatch } from '@/features/templates/templates-match';
import { t } from '@/lib/i18n';
import { FORM_KEYS } from '../registry-form/settings-form';
import type { SettingsFormState } from '../registry-form/use-settings-form';
import { SectionFields } from './SectionFields';

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
    <Section id="messaging" title={t.settings.sections.messaging}>
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
