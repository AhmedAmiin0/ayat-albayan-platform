import type { SavedReply, SavedReplyAttachment } from '@ab/shared';
import { useState } from 'react';
import { requestId } from '@/core/lib/http/request-id';
import { filledText, slashAt, slashSearch } from './reply-text';

/** A picked reply's file, waiting for «أرسل». */
export interface StagedFile {
  replyId: string;
  file: SavedReplyAttachment;
  /** Minted once at staging: every retry of this file's send reuses it (rule 8). */
  requestId: string;
}

/**
 * The composer's saved-reply state (owner 2026-10-26, as WhatsApp Business): «/» at the start of
 * the box or of a line docks the list over the composer, searched by what follows it; deleting
 * that «/», sending, or leaving the box closes it. The button opens the sheet instead. A pick only
 * changes the box's text and the chip: nothing is sent until «أرسل». `enabled` false (a teacher):
 * «/» is plain text.
 */
export function useSavedReplyDraft(input: { text: string; setText: (text: string) => void; enabled: boolean }) {
  const [slash, setSlash] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const [staged, setStaged] = useState<StagedFile | null>(null);
  const search = sheet ? null : slashSearch(input.text, slash);
  return {
    /** The docked «/» list's search, null while it is closed. */
    search,
    sheet,
    staged,
    open: () => setSheet(true),
    close: () => {
      setSheet(false);
      setSlash(null);
    },
    /** Leaving the box (a tap on the chat) or sending closes the «/» list, not the sheet. */
    dismiss: () => setSlash(null),
    clearStaged: () => setStaged(null),
    /** Call with each new box text: «/» at the start of the box or of a line docks the list. */
    typed: (next: string) => {
      const at = input.enabled ? slashAt(input.text, next) : null;
      if (at !== null) setSlash(at);
      else if (slashSearch(next, slash) === null) setSlash(null);
    },
    fill: (reply: string, picked: SavedReply) => {
      // A «/search» still in the box is replaced (from the list or the sheet); else the reply follows the text.
      const open = slashSearch(input.text, slash) === null ? null : slash;
      input.setText(filledText({ text: input.text, reply, slash: open }));
      const file = picked.attachment;
      // The same reply again keeps its id; a different reply is a new request.
      if (file) setStaged((now) => (now?.replyId === picked.id ? { ...now, file } : { replyId: picked.id, file, requestId: requestId() }));
      setSheet(false);
      setSlash(null);
    },
  };
}
