import { canLinkFamily, type ThreadView } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { useHolds } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, type TreeBase, useTreeBase } from '@/core/nav/tree-base';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { useTheme } from '@/theme';
import { registerHref } from '../../leads/sales/register-href';
import { ThreadListsSheet } from '../../lists/ThreadListsSheet';
import { copyText } from '../../messages/copy-download/chat-tools';
import { MoreIcon } from '../../shared/chat-icons';
import { useBubbleChatActions } from '../hooks/chat-actions';
import type { ThreadCache } from '../hooks/thread-cache';
import { type ThreadMenuItem, ThreadMenu } from './ThreadMenu';

interface ThreadHeaderActionsProps {
  phone: string;
  /** The cached thread: its newest page carries the chat's `lists`. */
  data: ThreadCache | undefined;
  /** A salesperson (self.sales): «تسجيل طالب جديد» on a lead and «تحقق من التسجيل» too. */
  sales: boolean;
}

interface MenuOptions {
  phone: string;
  sales: boolean;
  thread: ThreadView | null;
  openLists: () => void;
}

/** «تسجيل طالب جديد» on a lead still in the funnel: the trial wizard in sales mode, prefilled from the thread. */
function registerItem(base: TreeBase, thread: ThreadView | null): ThreadMenuItem[] {
  const href = registerHref(thread);
  return href ? [{ label: t.inbox.registerNew, onPress: () => router.push(inTree(base, href)) }] : [];
}

/**
 * The menu's actions, each behind its own key: a salesperson's «تسجيل طالب جديد» FIRST on a lead still in
 * the funnel (owner 2026-10-30: out of the pill strip; registerHref), «نسخ الرقم», «القوائم» (inbox.lists),
 * «تحقق من التسجيل», and «ربط بطالب موجود» (leads.link_family, owner 2026-10-29) on a lead's chat with no
 * family and no teacher.
 */
function useMenuItems({ phone, sales, thread, openLists }: MenuOptions) {
  const base = useTreeBase();
  const { showCopy } = useBubbleChatActions();
  const lists = useHolds('inbox.lists');
  const checks = useHolds('students.check_registration');
  const check = checks && sales;
  // The picker searches with the registration check (either tree), so it needs that key too.
  const linkLead = useHolds('leads.link_family') && checks && thread && canLinkFamily(thread) ? thread.lead_id : null;
  const items: ThreadMenuItem[] = [
    ...registerItem(base, sales ? thread : null),
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

/**
 * After the call button in an admin or assistant chat header (never a teacher's): ONE «⋮» that opens
 * the chat's menu (review 2026-10-29 #13): a salesperson's «تسجيل طالب جديد» on a lead (the trial wizard in
 * sales mode), «نسخ الرقم», «القوائم» with inbox.lists (docs/22), a salesperson's «تحقق من التسجيل» for this
 * number, and «ربط بطالب موجود» on a lead's chat in either tree. The lists' checklist sheet opens from it.
 */
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
