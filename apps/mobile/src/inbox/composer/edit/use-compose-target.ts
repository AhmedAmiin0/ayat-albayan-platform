import type { MessageView } from '@ab/shared';
import { type Dispatch, type SetStateAction, useState } from 'react';
import { setComposerText } from '@/inbox/composer/draft-store';

/** What the box's next text answers («رد») or corrects («تعديل»): one of them at most. */
interface ComposeTarget {
  reply: MessageView | null;
  setReply: Dispatch<SetStateAction<MessageView | null>>;
  editing: MessageView | null;
  startEdit: (m: MessageView) => void;
  cancelEdit: () => void;
  editSent: (id: string) => void;
}

/**
 * One open chat's «رد» and «تعديل» (owner 2026-11-07), as WhatsApp: picking a reply ends an edit,
 * starting an edit drops the reply and puts the original's text in the box; ✕ empties the box.
 * An updater (a send that settles its own reply) never ends an edit.
 */
export function useComposeTarget(phone: string): ComposeTarget {
  const [reply, setReplyNow] = useState<MessageView | null>(null);
  const [editing, setEditing] = useState<MessageView | null>(null);
  const setReply: Dispatch<SetStateAction<MessageView | null>> = (next) => {
    const picked = typeof next !== 'function' && next !== null;
    if (picked) setEditing(null);
    setReplyNow(next);
  };
  const startEdit = (m: MessageView) => {
    setReplyNow(null);
    setEditing(m);
    setComposerText(phone, m.body ?? '');
  };
  const cancelEdit = () => {
    setEditing(null);
    setComposerText(phone, '');
  };
  const editSent = (id: string) => setEditing((now) => (now?.id === id ? null : now));
  return { reply, setReply, editing, startEdit, cancelEdit, editSent };
}
