import { router } from 'expo-router';
import { useState } from 'react';
import { useHolds } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { useTheme } from '@/theme';
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
  /** A salesperson (self.sales): «تحقق من التسجيل» too. */
  sales: boolean;
}

/** The menu's actions, each behind its own key: «نسخ الرقم», «القوائم» (inbox.lists), «تحقق من التسجيل». */
function useMenuItems({ phone, sales, openLists }: { phone: string; sales: boolean; openLists: () => void }) {
  const base = useTreeBase();
  const { showCopy } = useBubbleChatActions();
  const lists = useHolds('inbox.lists');
  const check = useHolds('students.check_registration') && sales;
  const items: ThreadMenuItem[] = [
    { label: t.inbox.copy.phone, onPress: () => copyText({ title: t.inbox.copy.phoneTitle, text: phone }, showCopy) },
  ];
  if (lists) items.push({ label: t.inbox.lists.title, onPress: openLists });
  if (check) {
    const href = inTree(base, { pathname: '/inbox/registration-check', params: { phone } });
    items.push({ label: t.registrationCheck.action, onPress: () => router.push(href) });
  }
  return { items, lists };
}

/**
 * After the call button in an admin or assistant chat header (never a teacher's): ONE «⋮» that opens
 * the chat's menu (review 2026-10-29 #13): «نسخ الرقم», «القوائم» with inbox.lists (docs/22), and a
 * salesperson's «تحقق من التسجيل» for this number. The lists' checklist sheet opens from it.
 */
export function ThreadHeaderActions({ phone, data, sales }: ThreadHeaderActionsProps) {
  const { color } = useTheme();
  const [menu, setMenu] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);
  const { items, lists } = useMenuItems({ phone, sales, openLists: () => setListsOpen(true) });
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
