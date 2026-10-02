import { useState } from 'react';
import { t } from '@/lib/i18n';
import { FilterPills, type FilterPill } from '@/ui/FilterPills';
import { Screen } from '@/ui/Screen';
import { LeadsList } from './LeadsList';
import { ThreadsList } from './ThreadsList';

type View = 'threads' | 'leads';

const VIEWS: FilterPill<View>[] = [
  { value: 'threads', label: t.inbox.title },
  { value: 'leads', label: t.nav.leads },
];

/**
 * The «المحادثات» tab (R-MOB-02: leads + threads, reply, send a template): every WhatsApp thread
 * first — guardians and teachers included — and the new-leads pipeline one tap away.
 */
export function InboxScreen() {
  const [view, setView] = useState<View>('threads');
  const switcher = <FilterPills items={VIEWS} value={view} onChange={setView} accessibilityLabel={t.nav.conversations} />;
  return <Screen>{view === 'threads' ? <ThreadsList switcher={switcher} /> : <LeadsList switcher={switcher} />}</Screen>;
}
