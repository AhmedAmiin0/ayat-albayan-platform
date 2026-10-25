import type { KeyboardEvent, ReactNode, TextareaHTMLAttributes } from 'react';

/** What «الردود السريعة» (saved-replies/ReplyComposer) adds to TextComposer without it knowing replies. */
export interface ComposerExtras {
  /** The picker panel and the staged attachment's chip, above the message row. */
  above?: ReactNode;
  /** Runs first on every key; true when the key was taken (the «/» picker's ↑ ↓ Enter Esc). */
  onKey?: (e: KeyboardEvent<HTMLTextAreaElement>) => boolean;
  /** The box's id and the listbox wiring while «/» drives the picker. */
  boxProps?: TextareaHTMLAttributes<HTMLTextAreaElement> & { id?: string };
  /**
   * At «أرسل», before the box empties: what to run once THAT text went (the staged attachment captured
   * now follows through the chat's file send; one staged after the submit waits for its own send).
   */
  onSubmit?: () => (() => void) | undefined;
}
