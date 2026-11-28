import type { SavedReply, SavedReplyAttachment } from '@ab/shared';
import { useState } from 'react';
import { requestId } from '@/core/lib/http/request-id';
import { filledText, slashAt, slashSearch } from '@/inbox/saved-replies/lib/reply-text';

export interface StagedFile {
  replyId: string;
  file: SavedReplyAttachment;
  /** Minted once at staging: every retry of this file's send reuses it (rule 8). */
  requestId: string;
}

/** One prop carries all three so the slash list and the sheet reach the same draft. */
export interface ReplyFill {
  (text: string, reply: SavedReply): void;
  ask: (reply: SavedReply) => void;
  asking: SavedReply | null;
}

/** A pick only changes the box and chip, nothing is sent; slash is plain text for teachers. */
export function useSavedReplyDraft(input: { text: string; setText: (text: string) => void; enabled: boolean }) {
  const [slash, setSlash] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const [staged, setStaged] = useState<StagedFile | null>(null);
  const [asking, setAsking] = useState<SavedReply | null>(null);
  const search = sheet ? null : slashSearch(input.text, slash);
  return {
    /** The docked «/» list's search, null while it is closed. */
    search,
    sheet,
    staged,
    open: () => setSheet(true),
    /** Closing the fill form keeps the slash search in the box, so its list docks again. */
    close: () => {
      setSheet(false);
      if (!asking) setSlash(null);
      setAsking(null);
    },
    /**
     * Leaving the box (a tap on the chat) or sending closes the «/» list, not the sheet. The form's
     * inputs take the focus from the box: its «/search» stays, to be replaced by the filled reply.
     */
    dismiss: () => {
      if (!asking) setSlash(null);
    },
    clearStaged: () => setStaged(null),
    /** Call with each new box text: «/» at the start of the box or of a line docks the list. */
    typed: (next: string) => {
      const at = input.enabled ? slashAt(input.text, next) : null;
      if (at !== null) setSlash(at);
      else if (slashSearch(next, slash) === null) setSlash(null);
    },
    fill: Object.assign((reply: string, picked: SavedReply) => {
      // A «/search» left in the box is replaced; else the reply follows the text.
      const open = slashSearch(input.text, slash) === null ? null : slash;
      input.setText(filledText({ text: input.text, reply, slash: open }));
      const file = picked.attachment;
      // The same reply again keeps its id; a different reply is a new request.
      if (file) setStaged((now) => (now?.replyId === picked.id ? { ...now, file } : { replyId: picked.id, file, requestId: requestId() }));
      setSheet(false);
      setSlash(null);
      setAsking(null);
    }, {
      ask: (picked: SavedReply) => {
        setAsking(picked);
        setSheet(true);
      },
      asking,
    }) satisfies ReplyFill,
  };
}
