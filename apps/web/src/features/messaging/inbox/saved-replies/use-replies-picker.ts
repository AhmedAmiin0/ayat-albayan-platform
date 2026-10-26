import type { SavedReply, SavedReplyScope } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { savedRepliesQuery } from './api';
import { filterReplies, matchReplies, slashQuery, slashStart } from './filter';
import { usePickerKeys, type PickerKeys } from './use-picker-keys';

export interface RepliesPicker {
  open: boolean;
  /** Opened by «/» in the box (its text after the slash is the search) or by the button (its own search box). */
  bySlash: boolean;
  tab: SavedReplyScope;
  setTab: (tab: SavedReplyScope) => void;
  search: string;
  /** What the list is searched by: the box's text after «/», else the panel's own search. */
  query: string;
  setSearch: (search: string) => void;
  /** «إدارة» (the button's panel): «ردودي» rows get edit / delete, plus «رد جديد». */
  manage: boolean;
  setManage: (manage: boolean) => void;
  /** After «/» both tabs' matches (as WhatsApp), else this tab's; in served order. */
  list: SavedReply[];
  loading: boolean;
  failed: boolean;
  /** Loads the list again after a failure. */
  retry: () => void;
  keys: PickerKeys;
  /** Fill the composer with this tab's row `index` (a click, or Enter on the highlighted one). */
  pick: (index: number) => void;
  toggle: () => void;
  close: () => void;
}

export interface PickerInput {
  /** The composer's text: «/» at its start or after a newline opens the list. */
  text: string;
  /** Inside the 24 h window only; outside it nothing opens. */
  enabled: boolean;
  onPick: (reply: SavedReply) => void;
  /** Esc, «إغلاق» or the button again: the caller puts the focus back in the message box. */
  onClose?: () => void;
}

/**
 * The picker's state: open by the button or by «/», the tab, the search, «إدارة» and the keyboard. Esc on a
 * «/» trigger keeps it closed until a new «/» starts. The list loads the first time it opens.
 */
export function useRepliesPicker({ text, enabled, onPick, onClose }: PickerInput): RepliesPicker {
  const [manual, setManual] = useState(false);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [tab, setTab] = useState<SavedReplyScope>('shared');
  const [search, setSearch] = useState('');
  const [manage, setManage] = useState(false);
  const slash = enabled ? slashQuery(text) : null;
  const slashOpen = slash !== null && dismissedAt !== slashStart(text);
  const open = enabled && (manual || slashOpen);
  const bySlash = open && !manual;
  const replies = useQuery({ ...savedRepliesQuery, enabled: open });
  const all = replies.data ?? [];
  const list = bySlash ? matchReplies(all, slash ?? '') : filterReplies(all, { scope: tab, query: search });
  const close = () => {
    setManual(false);
    setManage(false);
    setSearch('');
    setDismissedAt(slash === null ? null : slashStart(text));
    onClose?.();
  };
  const pick = (index: number) => {
    const reply = list[index];
    if (!reply) return;
    close();
    setDismissedAt(null);
    onPick(reply);
  };
  const keys = usePickerKeys({ count: list.length, onPick: pick, onClose: close });
  return {
    ...{ open, bySlash, tab, search, setSearch, manage, list, keys, close, pick },
    query: bySlash ? (slash ?? '') : search,
    // «إدارة» is for her own replies: it shows «ردودي».
    setManage: (next) => {
      setManage(next);
      if (next) setTab('mine');
    },
    setTab: (next) => {
      setTab(next);
      keys.setActive(0);
    },
    loading: replies.isPending && open,
    failed: replies.isError,
    retry: () => void replies.refetch(),
    toggle: () => (open ? close() : setManual(true)),
  };
}
