import type { NotificationAudience } from '@ab/shared';
import { useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { t, FilterPills, Screen } from '@ab/mobile-kit';
import { CommsOverview } from '@/ops/comms/CommsOverview';
import { NotificationCatalogue } from './NotificationCatalogue';
import { NumbersList } from '@/ops/numbers/NumbersList';
import { SubScreenHeader } from '@/ops/shared/SubScreenHeader';

export type CommsTab = 'overview' | 'notifications' | 'numbers';

/** Read at render so admins' label overrides apply. */
export const commsTabs = (): { value: CommsTab; label: string }[] => [
  { value: 'overview', label: t.settingsPages.communicationsTabs.overview },
  { value: 'notifications', label: t.settingsValues.groups.notifications },
  { value: 'numbers', label: t.settingsPages.communicationsTabs.numbers },
];

/** docs/23 §2d, docs/26b §4: numbers, credentials and templates are edited on the web. */
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
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingTop: 8, paddingBottom: 32 }}>
        {tab === 'overview' ? <CommsOverview onOpenAudience={openAudience} onOpenNumbers={() => choose('numbers')} /> : null}
        {tab === 'notifications' ? <NotificationCatalogue key={audience ?? 'guardian'} initialAudience={audience} /> : null}
        {tab === 'numbers' ? <NumbersList /> : null}
      </ScrollView>
    </Screen>
  );
}
