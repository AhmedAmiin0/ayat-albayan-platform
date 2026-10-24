import type { NotificationAudience } from '@ab/shared';
import { useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { t } from '@/lib/i18n';
import { FilterPills } from '@/ui/FilterPills';
import { Screen } from '@/ui/Screen';
import { CommsOverview } from './comms/CommsOverview';
import { NotificationCatalogue } from './NotificationCatalogue';
import { NumbersList } from './NumbersList';
import { SubScreenHeader } from './SubScreenHeader';

export type CommsTab = 'overview' | 'notifications' | 'numbers';

/** The tabs: نظرة عامة · الإشعارات · الأرقام (read at render: admins' overrides apply). */
export const commsTabs = (): { value: CommsTab; label: string }[] => [
  { value: 'overview', label: t.settingsPages.communicationsTabs.overview },
  { value: 'notifications', label: t.settingsValues.groups.notifications },
  { value: 'numbers', label: t.settingsPages.communicationsTabs.numbers },
];

/**
 * «التواصل» on the phone (docs/23 §2d, docs/26b §4): one tab at a time — the overview (send state
 * read-only, numbers with health, «ماذا يُرسل الآن»), the catalogue's switches and «الأرقام».
 * Numbers, credentials and templates are edited on the web. A row of the overview opens
 * «الإشعارات» on its audience.
 */
export function CommunicationsScreen() {
  const [tab, setTab] = useState<CommsTab>('overview');
  const [audience, setAudience] = useState<NotificationAudience | undefined>(undefined);
  const scroll = useRef<ScrollView>(null);
  const go = (next: CommsTab) => {
    setTab(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const choose = (next: CommsTab) => {
    setAudience(undefined);
    go(next);
  };
  const openAudience = (next: NotificationAudience) => {
    setAudience(next);
    go('notifications');
  };
  return (
    <Screen>
      <SubScreenHeader title={t.settingsPages.communications} />
      <FilterPills accessibilityLabel={t.settingsPages.tabs} items={commsTabs()} value={tab} onChange={choose} />
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ gap: 20, paddingTop: 8, paddingBottom: 32 }}>
        {tab === 'overview' ? <CommsOverview onOpenAudience={openAudience} onOpenNumbers={() => choose('numbers')} /> : null}
        {tab === 'notifications' ? <NotificationCatalogue key={audience ?? 'guardian'} initialAudience={audience} /> : null}
        {tab === 'numbers' ? <NumbersList /> : null}
      </ScrollView>
    </Screen>
  );
}
