import { settingSection, type SettingsSectionId } from '@ab/shared';
import { matchesSetting } from '@/components/settings/settings-search';
import { useSettingsView } from '@/components/settings/settings-view';
import { RegistryField } from '../registry-form/RegistryField';
import { FORM_KEYS } from '../registry-form/settings-form';
import type { SettingsFormState } from '../registry-form/use-settings-form';

/** The registry's form fields of one section, in page order (SETTINGS_LAYOUT; nothing when it has none). */
export function SectionFields({ id, state }: { id: SettingsSectionId; state: SettingsFormState }) {
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
