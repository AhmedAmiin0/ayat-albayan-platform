import { useState, type ReactNode } from 'react';
import { canOpen } from '@/auth/route-permissions';
import { usePermissions } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { useTreeBase } from '@/core/nav/tree-base';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { LeadsList } from '../leads/list/LeadsList';
import { ThreadsList } from '../threads-list/ThreadsList';
import { CallsLog } from '../thread/calls/log/CallsLog';
import { useCallsEnabled } from '../thread/calls/state/call-context';

type View = 'threads' | 'leads' | 'calls';

/** The switcher's pills: the chats, then the leads (admin tree) and «المكالمات» (calls on, docs/28). */
const views = (has: { leads: boolean; calls: boolean }): FilterPill<View>[] => [
  { value: 'threads', label: t.inbox.title },
  ...(has.leads ? [{ value: 'leads' as const, label: t.nav.leads }] : []),
  ...(has.calls ? [{ value: 'calls' as const, label: t.calls.log.title }] : []),
];

/** The view shown: the one picked, when this role has it; else the chats, else the leads. */
function viewOf(picked: View, has: { threads: boolean; leads: boolean; calls: boolean }): View {
  if (picked === 'calls' && has.calls) return 'calls';
  return has.threads && (picked !== 'leads' || !has.leads) ? 'threads' : 'leads';
}

function body(view: View, switcher: ReactNode) {
  if (view === 'calls') return <CallsLog switcher={switcher} />;
  return view === 'threads' ? <ThreadsList switcher={switcher} /> : <LeadsList switcher={switcher} />;
}

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
  const callsOn = useCallsEnabled();
  const hasCalls = hasThreads && callsOn;
  const [picked, setPicked] = useState<View>('threads');
  const view = viewOf(picked, { threads: hasThreads, leads: hasLeads, calls: hasCalls });
  const switcher =
    hasThreads && (hasLeads || hasCalls) ? (
      <FilterPills items={views({ leads: hasLeads, calls: hasCalls })} value={view} onChange={setPicked} accessibilityLabel={t.nav.conversations} />
    ) : null;
  return <Screen list>{body(view, switcher)}</Screen>;
}
