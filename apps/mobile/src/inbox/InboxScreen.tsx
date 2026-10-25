import { useState } from 'react';
import { canOpen } from '@/auth/route-permissions';
import { usePermissions } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { useTreeBase } from '@/nav/tree-base';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { LeadsList } from './LeadsList';
import { ThreadsList } from './ThreadsList';

type View = 'threads' | 'leads';

const views = (): FilterPill<View>[] => [
  { value: 'threads', label: t.inbox.title },
  { value: 'leads', label: t.nav.leads },
];

/**
 * The «المحادثات» tab (R-MOB-02: leads + threads, reply, send a template): every WhatsApp thread
 * first — guardians and teachers included — and the new-leads pipeline one tap away. A role with
 * only one of inbox.read / leads.read gets that list alone, without the switcher. The leads stay in the
 * admin tree: the sales tree's «المحادثات» is the chats alone, as the web /sales/inbox.
 */
export function InboxScreen() {
  const can = usePermissions();
  const hasThreads = canOpen(can, 'inbox');
  const hasLeads = useTreeBase() === '' && can('leads.read');
  const [picked, setPicked] = useState<View>('threads');
  const view: View = hasThreads && (picked === 'threads' || !hasLeads) ? 'threads' : 'leads';
  const switcher =
    hasThreads && hasLeads ? (
      <FilterPills items={views()} value={view} onChange={setPicked} accessibilityLabel={t.nav.conversations} />
    ) : null;
  return <Screen list>{view === 'threads' ? <ThreadsList switcher={switcher} /> : <LeadsList switcher={switcher} />}</Screen>;
}
