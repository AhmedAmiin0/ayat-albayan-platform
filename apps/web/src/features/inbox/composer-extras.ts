import type { KeyboardEvent, ReactNode, TextareaHTMLAttributes } from 'react';

/** What «الردود السريعة» (saved-replies/ReplyComposer) adds to TextComposer without it knowing replies. */
export interface ComposerExtras {
  /** The picker panel and the staged attachment's chip, above the message row. */
  above?: ReactNode;
  /** Runs first on every key; true when the key was taken (the «/» picker's ↑ ↓ Enter Esc). */
  onKey?: (e: KeyboardEvent<HTMLTextAreaElement>) => boolean;
  /** The box's id and the listbox wiring while «/» drives the picker. */
  boxProps?: TextareaHTMLAttributes<HTMLTextAreaElement> & { id?: string };
  /** The text went: the staged attachment follows through the chat's file send. */
  onSent?: () => void;
}
