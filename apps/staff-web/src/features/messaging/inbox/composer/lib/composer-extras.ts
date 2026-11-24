import type { KeyboardEvent, ReactNode, TextareaHTMLAttributes } from 'react';

export interface ComposerExtras {
  /** The picker panel and the staged attachment's chip, above the message row. */
  above?: ReactNode;
  /** Runs first on every key; true when the key was taken (the «/» picker's ↑ ↓ Enter Esc). */
  onKey?: (e: KeyboardEvent<HTMLTextAreaElement>) => boolean;
  /** The box's id and the listbox wiring while «/» drives the picker. */
  boxProps?: TextareaHTMLAttributes<HTMLTextAreaElement> & { id?: string };
  /** Runs once THAT text went; an attachment staged after submit waits for its own send. */
  onSubmit?: () => (() => void) | undefined;
}
