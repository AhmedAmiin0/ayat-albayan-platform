import type { AcademySettings, NotificationAudience } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { tabIds } from '@/components/ui/tabs';
import { Toast } from '@/components/ui/toast';
import { useRuleDrafts, type RuleDrafts } from '@/features/notification-rules/rule-drafts';
import { RulesSection } from '@/features/notification-rules/RulesSection';
import { t } from '@/lib/i18n';
import type { CommunicationsTab } from '../page-search';
import { NumbersTab } from './NumbersTab';
import { OverviewTab } from './OverviewTab';
import { SafetyTab } from './SafetyTab';
import { TemplatesTab } from './TemplatesTab';

/** The id prefix of «التواصل»'s tabs and panel (tabIds). */
export const COMMUNICATIONS_TABS_ID = 'communications';

interface BodyProps {
  tab: CommunicationsTab;
  audience?: NotificationAudience | undefined;
  settings: AcademySettings;
  /** The leave guard, given the names of the unsaved rows (the route passes LeaveGuard). */
  renderGuard?: ((names: readonly string[]) => ReactNode) | undefined;
}

interface TabBodyProps {
  tab: CommunicationsTab;
  audience: NotificationAudience | undefined;
  settings: AcademySettings;
  drafts: RuleDrafts;
  onNote: (message: string) => void;
}

function TabBody({ tab, audience, settings, drafts, onNote }: TabBodyProps) {
  if (tab === 'numbers') return <NumbersTab onNote={onNote} />;
  if (tab === 'catalogue') return <RulesSection onSaved={onNote} drafts={drafts} audience={audience} />;
  if (tab === 'templates') return <TemplatesTab />;
  if (tab === 'safety') return <SafetyTab settings={settings} onNote={onNote} />;
  return <OverviewTab settings={settings} />;
}

/**
 * «التواصل» once the settings are in: the tab in view, its one toast, and the «الإشعارات» row
 * drafts, held here so they outlive a tab switch (S3); the guard names them. The timing values
 * «مواعيد الرسائل» had are edited in «القيم» › «الرسائل» now (docs/26b §6a 1.16, 1.19).
 */
export function CommunicationsBody({ tab, audience, settings, renderGuard }: BodyProps) {
  const [note, setNote] = useState<string | null>(null);
  const drafts = useRuleDrafts();
  const ids = tabIds(COMMUNICATIONS_TABS_ID, tab);
  const names = drafts.keys.map((k) => t.notificationCatalogue.entries[k].name);
  return (
    <>
      <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab} className="min-w-0">
        <TabBody tab={tab} audience={audience} settings={settings} drafts={drafts} onNote={setNote} />
      </div>
      {renderGuard?.(names)}
      {note && <Toast message={note} onDismiss={() => setNote(null)} />}
    </>
  );
}
