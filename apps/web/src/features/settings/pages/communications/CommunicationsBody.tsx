import { RULE_SETTING_KEYS, settingSection, type AcademySettings, type SettingKey } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { settingText } from '@/components/settings/setting-text';
import { tabIds } from '@/components/ui/tabs';
import { Toast } from '@/components/ui/toast';
import { RulesSection } from '@/features/notification-rules/RulesSection';
import { t } from '@/lib/i18n';
import { FORM_KEYS } from '../../registry-form/settings-form';
import { useSettingsForm, type SettingsFormState } from '../../registry-form/use-settings-form';
import type { CommunicationsTab } from '../page-search';
import { NumbersTab } from './NumbersTab';
import { SendingTab } from './SendingTab';
import { TemplatesTab } from './TemplatesTab';
import { TimingTab } from './TimingTab';

/** The id prefix of «التواصل»'s tabs and panel (tabIds). */
export const COMMUNICATIONS_TABS_ID = 'communications';

const RULE_KEYS: readonly SettingKey[] = RULE_SETTING_KEYS;

/**
 * The fields «مواعيد الرسائل» shows and saves: the «messaging» rows of the generic form, minus the 8
 * keys the notification rules own now (docs/23b §1: edited on «الإشعارات», PATCH /settings moves them).
 */
export const TIMING_KEYS = FORM_KEYS.filter((k) => settingSection(k) === 'messaging' && !RULE_KEYS.includes(k));

interface BodyProps {
  tab: CommunicationsTab;
  settings: AcademySettings;
  /** The leave guard, given the names of the unsaved fields (the route passes LeaveGuard). */
  renderGuard?: ((names: readonly string[]) => ReactNode) | undefined;
}

interface TabBodyProps {
  tab: CommunicationsTab;
  settings: AcademySettings;
  timing: SettingsFormState;
  onNote: (message: string) => void;
}

function TabBody({ tab, settings, timing, onNote }: TabBodyProps) {
  if (tab === 'numbers') return <NumbersTab onNote={onNote} />;
  if (tab === 'catalogue') return <RulesSection onSaved={onNote} />;
  if (tab === 'timing') return <TimingTab state={timing} keys={TIMING_KEYS} />;
  if (tab === 'templates') return <TemplatesTab />;
  return <SendingTab settings={settings} />;
}

/**
 * «التواصل» once the settings are in: the tab in view, its one toast, and the timing form, held
 * here so it outlives a tab switch (S3). «حفظ» sends only the timing fields that changed (S2);
 * one another page owns comes back «تُدار من صفحة أخرى» and stays unsaved.
 */
export function CommunicationsBody({ tab, settings, renderGuard }: BodyProps) {
  const [note, setNote] = useState<string | null>(null);
  const timing = useSettingsForm(settings, {
    keys: TIMING_KEYS,
    onSaved: ({ moved }) => setNote(moved.length > 0 ? t.settingsValues.moved : t.settings.saved),
  });
  const ids = tabIds(COMMUNICATIONS_TABS_ID, tab);
  return (
    <>
      <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab} className="min-w-0">
        <TabBody tab={tab} settings={settings} timing={timing} onNote={setNote} />
      </div>
      {renderGuard?.(timing.changed.map((k) => settingText(k).label))}
      {note && <Toast message={note} onDismiss={() => setNote(null)} />}
    </>
  );
}
