import { settingSection, type SettingsSectionId } from '@ab/shared';
import { Section } from '@/components/settings/Section';
import { matchesSetting } from '@/components/settings/settings-search';
import { useSettingsView } from '@/components/settings/settings-view';
import { t } from '@/lib/i18n';
import { FORM_KEYS } from '../registry-form/settings-form';
import type { SettingsFormState } from '../registry-form/use-settings-form';
import { SectionFields } from './SectionFields';

/** Any section made only of registry fields: schedule, classroom, reports, accounts, uploads, academy. */
export function FieldsSection({ id, state }: { id: SettingsSectionId; state: SettingsFormState }) {
  const { query } = useSettingsView();
  if (query.trim() !== '' && !FORM_KEYS.some((k) => settingSection(k) === id && matchesSetting(k, query))) return null;
  return (
    <Section id={id} title={t.settings.sections[id]}>
      <SectionFields id={id} state={state} />
    </Section>
  );
}
