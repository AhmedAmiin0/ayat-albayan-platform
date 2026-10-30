import type { SavedReply, SavedReplyScope } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { DeleteReplyDialog } from '../components/DeleteReplyDialog';
import { ReplyEditorDialog } from '../components/ReplyEditorDialog';

type Open = { kind: 'edit'; reply: SavedReply | null } | { kind: 'delete'; reply: SavedReply } | null;

/** The add / edit / delete dialogs of one list (`scope` for a new reply), opened from a row or a button. */
export function useReplyDialogs(scope: SavedReplyScope): {
  add: () => void;
  edit: (reply: SavedReply) => void;
  remove: (reply: SavedReply) => void;
  dialogs: ReactNode;
} {
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);
  const dialogs =
    open?.kind === 'edit' ? (
      <ReplyEditorDialog reply={open.reply} scope={scope} onClose={close} />
    ) : open?.kind === 'delete' ? (
      <DeleteReplyDialog reply={open.reply} onClose={close} />
    ) : null;
  return {
    add: () => setOpen({ kind: 'edit', reply: null }),
    edit: (reply) => setOpen({ kind: 'edit', reply }),
    remove: (reply) => setOpen({ kind: 'delete', reply }),
    dialogs,
  };
}
