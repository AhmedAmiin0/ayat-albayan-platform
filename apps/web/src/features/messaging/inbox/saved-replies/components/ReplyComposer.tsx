import { resolveSavedReply, type SavedReply, type ThreadView } from '@ab/shared';
import { useId, useSyncExternalStore, type ReactNode } from 'react';
import { getDraft, setDraft, subscribeDrafts } from '@/features/messaging/inbox/composer/lib/draft-store';
import type { PrefillContext } from '@/features/messaging/inbox/composer/lib/template-params';
import { TextComposer } from '@/features/messaging/inbox/composer/components/TextComposer';
import { fillComposer, slashQuery } from '@/features/messaging/inbox/saved-replies/lib/filter';
import { RepliesPanel } from './RepliesPanel';
import { optionId } from './ReplyOptions';
import { SavedRepliesButton } from './SavedRepliesButton';
import { StagedChip } from './StagedChip';
import { getStaged, setStaged, subscribeStaged } from '@/features/messaging/inbox/saved-replies/lib/staged-store';
import { useReplyDialogs } from '@/features/messaging/inbox/saved-replies/hooks/use-reply-dialogs';
import { useReplyValues } from '@/features/messaging/inbox/saved-replies/hooks/use-reply-values';
import { useRepliesPicker } from '@/features/messaging/inbox/saved-replies/hooks/use-replies-picker';
import { useStagedSend } from '@/features/messaging/inbox/saved-replies/hooks/use-staged-send';
import { useMaySend } from '@/features/messaging/inbox/shared/may-send';

export interface ReplyComposerProps {
  thread: ThreadView;
  context: PrefillContext;
  /** The template toggle and the paperclip; the replies button follows them. */
  leading: ReactNode;
}

/** Puts the caret at the end, back in the box (after a pick or a close the picker's search had the focus). */
function focusBox(id: string): void {
  requestAnimationFrame(() => {
    const box = document.getElementById(id);
    if (!(box instanceof HTMLTextAreaElement)) return;
    box.focus();
    box.setSelectionRange(box.value.length, box.value.length);
  });
}

/** True when a pick replaces the whole box content (its «/» token, or nothing typed). */
const replacesBox = (text: string): boolean => slashQuery(text) !== null || !text.trim();

/**
 * The message box with «الردود السريعة» (owner 2026-10-25), inside the 24 h window only: the button or
 * «/» opens the picker; a pick FILLS the box (placeholders resolved, still editable) and stages its
 * file as a chip. Nothing leaves before «أرسل»: then the text, then the file through the chat's own send.
 */
export function ReplyComposer({ thread, context, leading }: ReplyComposerProps) {
  const phone = thread.phone_e164;
  const boxId = useId();
  const listId = useId();
  const draft = useSyncExternalStore(subscribeDrafts, () => getDraft(phone));
  const staged = useSyncExternalStore(subscribeStaged, () => getStaged(phone));
  const values = useReplyValues(thread, context);
  const fileSend = useStagedSend(phone);
  const dialogs = useReplyDialogs('mine');
  const onPick = (reply: SavedReply) => {
    const before = getDraft(phone).text;
    setDraft(phone, { text: fillComposer(before, resolveSavedReply(reply.body, values)), failed: null });
    const next = reply.attachment ? { replyId: reply.id, attachment: reply.attachment, requestId: crypto.randomUUID(), failed: null } : null;
    // A pick that replaces the box (a «/» token or an empty box) replaces its file too; one added after text keeps it.
    if (next || replacesBox(before)) setStaged(phone, next);
    focusBox(boxId);
  };
  const may = useMaySend(thread);
  const picker = useRepliesPicker({ text: draft.text, enabled: may, onPick, onClose: () => focusBox(boxId) });
  const active = picker.bySlash && picker.list.length ? optionId(listId, picker.keys.active) : undefined;
  const above = (
    <>
      {picker.open && <RepliesPanel picker={picker} listId={listId} onAdd={dialogs.add} onEdit={dialogs.edit} onDelete={dialogs.remove} />}
      {staged && (
        <StagedChip
          staged={staged}
          pending={fileSend.isPending}
          onRemove={() => setStaged(phone, null)}
          onRetry={() => fileSend.mutate({ ...staged, failed: null })}
        />
      )}
    </>
  );
  const extras = {
    above,
    onKey: (e: Parameters<typeof picker.keys.onKey>[0]) => picker.bySlash && picker.keys.onKey(e),
    boxProps: { id: boxId, 'aria-controls': picker.bySlash ? listId : undefined, 'aria-activedescendant': active },
    // The file staged at «أرسل» follows that text only if it is still the one staged (not a later pick's).
    onSubmit: () => {
      const at = getStaged(phone)?.requestId;
      if (!at) return undefined;
      return () => {
        const next = getStaged(phone);
        if (next?.requestId === at) fileSend.mutate({ ...next, failed: null });
      };
    },
  };
  return (
    <>
      <TextComposer phone={phone} leading={<>{leading}<SavedRepliesButton pressed={picker.open && !picker.bySlash} onClick={picker.toggle} /></>} extras={extras} />
      {dialogs.dialogs}
    </>
  );
}
