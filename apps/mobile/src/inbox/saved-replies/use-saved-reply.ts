import type { SavedReply, SavedReplyAttachment } from '@ab/shared';
import { useState } from 'react';
import { requestId } from '@/lib/request-id';
import { filledText, slashAt } from './reply-text';

/** A picked reply's file, waiting for «أرسل». */
export interface StagedFile {
  replyId: string;
  file: SavedReplyAttachment;
  /** Minted once at staging: every retry of this file's send reuses it (rule 8). */
  requestId: string;
}

/**
 * The composer's saved-reply state: the open picker (and the «/» it replaces) and the staged file.
 * A pick only changes the box's text and the chip: nothing is sent until «أرسل». `enabled` false
 * (a teacher): «/» is plain text.
 */
export function useSavedReplyDraft(input: { text: string; setText: (text: string) => void; enabled: boolean }) {
  const [picker, setPicker] = useState<{ slash: number | null } | null>(null);
  const [staged, setStaged] = useState<StagedFile | null>(null);
  return {
    picker,
    staged,
    open: () => setPicker({ slash: null }),
    close: () => setPicker(null),
    clearStaged: () => setStaged(null),
    /** Call with each new box text: «/» at the start of the box or of a line opens the picker. */
    typed: (next: string) => {
      const at = input.enabled ? slashAt(input.text, next) : null;
      if (at !== null) setPicker({ slash: at });
    },
    fill: (reply: string, picked: SavedReply) => {
      input.setText(filledText({ text: input.text, reply, slash: picker?.slash ?? null }));
      const file = picked.attachment;
      // The same reply again keeps its id; a different reply is a new request.
      if (file) setStaged((now) => (now?.replyId === picked.id ? { ...now, file } : { replyId: picked.id, file, requestId: requestId() }));
      setPicker(null);
    },
  };
}
