/** What a chat's send rule reads: its 24 h window and the API's «try after the window» flag. */
export interface ChatSendState {
  /** WhatsApp's 24 h window since the family's last message is open. */
  open: boolean;
  /** ThreadView.try_after_window: the chat line runs on Kapso (owner 2026-11-03: held texts). */
  tryAfterWindow?: boolean | undefined;
}

/**
 * May a staff send go from this chat now (owner 2026-11-01, «do the same as the messages»)? One
 * rule for a text, a reply, a payment link, a file or receipt, a sticker, a GIF and a forward:
 * inside the window always; after it a staff member (never a teacher, docs/19) still sends on a
 * Kapso chat line: the reopen template goes first and the text after the family replies.
 */
export function staffMaySend(chat: ChatSendState, staff: boolean): boolean {
  return chat.open || (staff && chat.tryAfterWindow === true);
}

/** Tried after the window (the composer's «try» note): staffMaySend while the window is closed. */
export function triesAfterWindow(chat: ChatSendState, staff: boolean): boolean {
  return !chat.open && staffMaySend(chat, staff);
}

/** The composer's after-the-window note per the admin's choice (owner 2026-11-06), in i18n inbox. */
const AFTER_WINDOW_NOTE = { template: 'tryAfterWindow', wait: 'tryAfterWindowWait' } as const;
export type AfterWindowNote = (typeof AFTER_WINDOW_NOTE)[keyof typeof AFTER_WINDOW_NOTE];

/** ThreadView.reopen_choice → its note's key; absent (an older API) reads as the template. */
export function afterWindowNote(choice: 'template' | 'wait' | undefined): AfterWindowNote {
  return AFTER_WINDOW_NOTE[choice ?? 'template'];
}
