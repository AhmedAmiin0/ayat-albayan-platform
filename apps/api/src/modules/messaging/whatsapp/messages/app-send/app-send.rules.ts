import type { MessageRow } from '@/modules/messaging/whatsapp/messages/message.mapper';
import { canSendViaWhatsApp } from '@ab/shared';

/** The row as the tap reads it: what makes it a staff text the 24 h window stopped. */
export type AppSendRow = Pick<
  MessageRow,
  | 'direction'
  | 'status'
  | 'error_code'
  | 'body'
  | 'template_key'
  | 'media_mime'
  | 'media_path'
  | 'created_by'
  | 'line'
>;

/** Written by staff in the inbox (the API stamps created_by), never a job or history row. */
const byStaff = (r: AppSendRow): boolean => r.created_by !== null;

/** No file of any kind (a stored one, or a mime on the row): v1 is text only. */
const textOnly = (r: AppSendRow): boolean => r.media_path === null && r.media_mime === null;

/**
 * «أرسل عبر واتساب» may start on this row: a staff text, held after the window (awaiting_reply)
 * or failed for a window reason (canSendViaWhatsApp), on the chat line (never the calls number).
 */
export function appSendable(r: AppSendRow): boolean {
  return byStaff(r) && textOnly(r) && r.line !== 'calls' && canSendViaWhatsApp(r);
}
