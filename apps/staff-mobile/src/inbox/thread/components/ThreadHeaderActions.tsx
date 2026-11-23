import { canLinkFamily, type ThreadView } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { useHolds, t, IconButton, useTheme } from '@ab/mobile-kit';
import { inTree, type TreeBase, useTreeBase } from '@/core/nav/tree-base';
import { registerHref } from '@/inbox/leads/sales/register-href';
import { ThreadListsSheet } from '@/inbox/lists/components/ThreadListsSheet';
import { copyText } from '@/inbox/messages/copy-download/chat-tools';
import { MoreIcon } from '@/inbox/shared/chat-icons';
import { useBubbleChatActions } from '@/inbox/thread/hooks/chat-actions';
import type { ThreadCache } from '@/inbox/thread/hooks/thread-cache';
import { type ThreadMenuItem, ThreadMenu } from './ThreadMenu';
import { useChatSearch } from '@/inbox/thread/search';

interface ThreadHeaderActionsProps {
  phone: string;
  /** The cached thread: its newest page carries the chat's `lists`. */
  data: ThreadCache | undefined;
  sales: boolean;
}

interface MenuOptions {
  phone: string;
  sales: boolean;
  thread: ThreadView | null;
  openLists: () => void;
}

/** Only on a lead still in the funnel; opens the trial wizard in sales mode, prefilled. */
function registerItem(base: TreeBase, thread: ThreadView | null): ThreadMenuItem[] {
  const href = registerHref(thread);
  return href ? [{ label: t.inbox.registerNew, onPress: () => router.push(inTree(base, href)) }] : [];
}

/** Registration comes first, and only on a lead still in the funnel (registerHref). */
function useMenuItems({ phone, sales, thread, openLists }: MenuOptions) {
  const base = useTreeBase();
  const { showCopy } = useBubbleChatActions();
  const search = useChatSearch();
  const lists = useHolds('inbox.lists');
  const checks = useHolds('students.check_registration');
  const check = checks && sales;
  // The picker searches with the registration check (either tree), so it needs that key too.
  const linkLead = useHolds('leads.link_family') && checks && thread && canLinkFamily(thread) ? thread.lead_id : null;
  const items: ThreadMenuItem[] = [
    ...registerItem(base, sales ? thread : null),
    ...(search ? [{ label: t.inbox.chatSearch.open, onPress: search.open }] : []),
    { label: t.inbox.copy.phone, onPress: () => copyText({ title: t.inbox.copy.phoneTitle, text: phone }, showCopy) },
  ];
  if (lists) items.push({ label: t.inbox.lists.title, onPress: openLists });
  if (check) {
    const href = inTree(base, { pathname: '/inbox/registration-check', params: { phone } });
    items.push({ label: t.registrationCheck.action, onPress: () => router.push(href) });
  }
  if (linkLead) {
    const href = inTree(base, { pathname: '/inbox/link-family', params: { phone, leadId: linkLead } });
    items.push({ label: t.inbox.linkFamily.action, onPress: () => router.push(href) });
  }
  return { items, lists };
}

/** Never in a teacher's header; one overflow menu keeps room for the name. */
export function ThreadHeaderActions({ phone, data, sales }: ThreadHeaderActionsProps) {
  const { color } = useTheme();
  const [menu, setMenu] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);
  const thread = data?.pages[0]?.thread ?? null;
  const { items, lists } = useMenuItems({ phone, sales, thread, openLists: () => setListsOpen(true) });
  return (
    <>
      <IconButton label={t.inbox.chatMenu} onPress={() => setMenu(true)}>
        <MoreIcon color={color.lapis} />
      </IconButton>
      <ThreadMenu open={menu} items={items} onClose={() => setMenu(false)} />
      {lists ? (
        <ThreadListsSheet
          phone={phone}
          member={data?.pages[0]?.lists ?? []}
          open={listsOpen}
          onClose={() => setListsOpen(false)}
        />
      ) : null}
    </>
  );
}
