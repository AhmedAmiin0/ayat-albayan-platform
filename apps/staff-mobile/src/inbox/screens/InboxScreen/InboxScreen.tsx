import { useState, type ReactNode } from 'react';
import { canOpen } from '@/core/auth/route-permissions';
import { usePermissions, t, FilterPills, type FilterPill, Screen } from '@ab/mobile-kit';
import { useTreeBase } from '@/core/nav/tree-base';
import { LeadsList } from '@/inbox/leads/list/LeadsList';
import { ThreadsList } from '@/inbox/threads-list/ThreadsList';
import { CallsLog } from '@/inbox/thread/calls/log/CallsLog';
import { useCallsEnabled } from '@/inbox/thread/calls/state/call-context';

type View = 'threads' | 'leads' | 'calls';

/** Calls appear only when calls are on (docs/28). */
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

/** R-MOB-02: a role with only inbox.read or leads.read gets that list without the switcher. */
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
      <FilterPills
        items={views({ leads: hasLeads, calls: hasCalls })}
        value={view}
        onChange={setPicked}
        accessibilityLabel={t.nav.conversations}
      />
    ) : null;
  return <Screen list>{body(view, switcher)}</Screen>;
}
