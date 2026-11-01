/** What a chat's send rule reads: its 24 h window and the API's «try after the window» flag. */
export interface ChatSendState {
  /** WhatsApp's 24 h window since the family's last message is open. */
  open: boolean;
  /** ThreadView.try_after_window: the chat line runs on Kapso (owner 2026-10-31). */
  tryAfterWindow?: boolean | undefined;
}

/**
 * May a staff send go from this chat now (owner 2026-11-01, «do the same as the messages»)? One
 * rule for a text, a reply, a payment link, a file or receipt, a sticker, a GIF and a forward:
 * inside the window always; after it a staff member (never a teacher, docs/19) still tries on a
 * Kapso chat line, and WhatsApp's refusal (131047) shows on that bubble. Templates keep theirs.
 */
export function staffMaySend(chat: ChatSendState, staff: boolean): boolean {
  return chat.open || (staff && chat.tryAfterWindow === true);
}

/** Tried after the window (the composer's «try» note): staffMaySend while the window is closed. */
export function triesAfterWindow(chat: ChatSendState, staff: boolean): boolean {
  return !chat.open && staffMaySend(chat, staff);
}
