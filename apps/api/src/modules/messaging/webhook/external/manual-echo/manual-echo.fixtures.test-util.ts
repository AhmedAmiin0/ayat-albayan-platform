import { vi } from 'vitest';
import type { ExternalMessage } from '@/modules/messaging/webhook/external/external-message';
import type { ReopenCancel } from '@/modules/messaging/whatsapp';
import type { AppSendRow } from './manual-echo';
import type { AttachWrite, ManualEchoRepo } from './manual-echo.repo';
import { ManualEcho } from './manual-echo.service';

export const PHONE = '+966500000001';
export const SENT_AT = new Date('2026-11-06T10:05:00Z');
export const CHAT = { line: 'chat', numberId: 'num-chat' };

/** A row in memory: the attach's columns plus what its compare-and-set reads. */
export type MemRow = AppSendRow & {
  phone: string;
  wa_message_id: string | null;
  status: string;
  error_code: string | null;
  staff: boolean;
};

/** Tapped at 10:00 (window to 10:10), held for the family's reply. */
export const row = (over: Partial<MemRow> = {}): MemRow => ({
  id: 'm1',
  body: 'السلام عليكم\nموعد الحلقة غدًا',
  line: 'chat',
  number_id: 'num-chat',
  app_send_until: '2026-11-06T10:10:00.000Z',
  lead_id: null,
  dedup_key: null,
  phone: PHONE,
  wa_message_id: null,
  status: 'queued',
  error_code: 'awaiting_reply',
  staff: true,
  ...over,
});

export const echo = (over: Partial<ExternalMessage> = {}): ExternalMessage => ({
  waMessageId: 'wamid.APP1',
  to: '966500000001',
  at: SENT_AT,
  type: 'text',
  body: 'السلام عليكم  موعد الحلقة\tغدًا ',
  templateName: null,
  templateParams: null,
  mediaId: null,
  mediaMime: null,
  mediaName: null,
  replyTo: null,
  status: null,
  direction: null,
  payload: null,
  ...over,
});

const inSpan = (r: MemRow, s: { since: Date; until: Date }): boolean => {
  const at = Date.parse(r.app_send_until ?? '');
  return at >= s.since.getTime() && at <= s.until.getTime();
};

/** ManualEchoRepo over rows in memory: the read and the compare-and-set as the real one. */
export function memoryRepo(rows: MemRow[]) {
  const open = (r: MemRow) => r.wa_message_id === null && r.app_send_until !== null;
  const attachable = (r: MemRow) =>
    ['queued', 'failed', 'sent_manually'].includes(r.status) && r.error_code !== 'sending';
  return {
    candidates: async (phone: string, span: { since: Date; until: Date }) =>
      rows.filter((r) => r.phone === phone && r.staff && open(r) && inSpan(r, span)),
    attach: async (w: AttachWrite) => {
      const hit = rows.find((r) => r.id === w.row.id && open(r) && attachable(r));
      if (!hit || rows.some((r) => r.wa_message_id === w.waMessageId)) return false;
      const status = String(w.patch.status);
      const cleared = { app_send_until: null, error_code: null };
      Object.assign(hit, { wa_message_id: w.waMessageId, status, ...cleared });
      return true;
    },
  };
}

export function attachOf(rows: MemRow[]) {
  const reopens = { afterAttach: vi.fn(async () => ({ cancelled: 1 })) };
  const repo = memoryRepo(rows) as unknown as ManualEchoRepo;
  return { svc: new ManualEcho(repo, reopens as unknown as ReopenCancel), reopens };
}
