import {
  carriesText,
  messageTemplate,
  reopenTick,
  windowBar,
  type WindowBar,
} from '@ab/client-core';
import type { MessageStatus, MessageView, ThreadView } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useApprovedTemplates } from '@/inbox/composer/TemplatePicker';
import { threadKey, threadMessages, type ThreadCache } from '@/inbox/thread/hooks/thread-cache';
import { useComposerDraft } from '@/inbox/composer/draft-store';
import { PINS } from '@/inbox/thread/send/pinned-send';
import { audienceOf, reopenAllowed } from './reopen-choices';

/** Which sheet is open: «إعادة فتح المحادثة», «أرسِل الآن داخل قالب», or none. */
type Picking = 'reopen' | 'carry' | null;

interface ReopenBarState {
  /** null: no thread yet (a new chat keeps its first-template row). */
  bar: WindowBar | null;
  /** The live reopen template's tick («sent»). */
  tick: MessageStatus | null;
  /** A chat-line template this user may send exists (the button shows). */
  canReopen: boolean;
  /** «أرسِل الآن داخل قالب» (owner 2026-11-14): a draft, and academy_message usable here. */
  carrying: boolean;
  /** The chat's unsent draft (the box), carried into academy_message's {{1}}. */
  draft: string;
  /** The reopen sheet is open: the plain reopen, or carrying the draft. */
  picking: Picking;
  setPicking: (next: Picking) => void;
}

interface ReopenBarInput {
  phone: string;
  thread: ThreadView | null;
  open: boolean;
  teacher: boolean;
}

/**
 * The composer's bar after the 24 h window (owner 2026-11-14, «like Kapso»): windowBar over the
 * thread's live reopen (reopen_sent) and this user's chat-line templates; the tick is the
 * reopen bubble's own, as the poll moves it.
 */
export function useReopenBar({ phone, thread, open, teacher }: ReopenBarInput): ReopenBarState {
  const client = useQueryClient();
  const [picking, setPicking] = useState<Picking>(null);
  const draft = useComposerDraft(phone);
  const templates = useApprovedTemplates(thread !== null && !open);
  const choices = reopenAllowed(templates.data, teacher, thread?.reopen_template);
  // None at all for this audience: the help line. Some, none on the chat line: no button.
  const noneAllowed = templates.isSuccess && audienceOf(templates.data, teacher).length === 0;
  const canReopen = !templates.isSuccess || choices.list.length > 0;
  const messages = threadMessages(client.getQueryData<ThreadCache>(threadKey(phone)));
  const bar = barOf({ thread, open, noneAllowed }, messages);
  const template = messageTemplate(audienceOf(templates.data, teacher));
  // A box send with no answer pins its id: the server may hold that text, never carry it too.
  const unconfirmed = PINS.box.pinned(phone) !== undefined;
  const carrying = bar.bar !== null && carriesText({ bar: bar.bar, draft, template, unconfirmed });
  return { ...bar, canReopen, carrying, draft, picking, setPicking };
}

type BarFields = Pick<ReopenBarState, 'bar' | 'tick'>;
type BarInput = Pick<ReopenBarInput, 'thread' | 'open'> & { noneAllowed: boolean };

/** The bar and its tick; no thread yet: none (a new chat keeps its first-template row). */
function barOf(input: BarInput, messages: readonly MessageView[]): BarFields {
  const { thread, open, noneAllowed } = input;
  if (!thread) return { bar: null, tick: null };
  const sent = thread.reopen_sent ?? null;
  return {
    bar: windowBar({ open, sent: sent !== null, noneAllowed }),
    tick: sent ? reopenTick(sent, messages) : null,
  };
}
