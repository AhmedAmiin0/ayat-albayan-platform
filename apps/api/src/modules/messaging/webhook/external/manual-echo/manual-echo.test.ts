import { describe, expect, it } from 'vitest';
import type { ExternalMessage } from '@/modules/messaging/webhook/external/external-message';
import { foldText, type ManualRow, manualMatches, markSpan } from './manual-echo';
import type { AttachWrite, ManualEchoRepo } from './manual-echo.repo';
import { ManualEcho } from './manual-echo.service';

const PHONE = '+966500000001';
const ECHO_AT = new Date('2026-11-06T10:20:00Z');
const CHAT = { line: 'chat', numberId: 'num-chat' };

type MemRow = ManualRow & { phone: string };
const row = (over: Partial<MemRow> = {}): MemRow => ({
  id: 'm1',
  body: 'السلام عليكم\nموعد الحلقة غدًا',
  line: 'chat',
  number_id: 'num-chat',
  sent_manually_at: '2026-11-06T10:10:00.000Z',
  phone: PHONE,
  wa_message_id: null,
  sent_at: null,
  ...over,
});

const echo = (over: Partial<ExternalMessage> = {}): ExternalMessage => ({
  waMessageId: 'wamid.APP1',
  to: '966500000001',
  at: ECHO_AT,
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

/** ManualEchoRepo over in-memory rows: the span and the compare-and-set as the real one. */
function memoryRepo(rows: ReturnType<typeof row>[]) {
  const inSpan = (r: ManualRow, s: { since: Date; until: Date }) => {
    const at = Date.parse(r.sent_manually_at ?? '');
    return at >= s.since.getTime() && at <= s.until.getTime();
  };
  return {
    candidates: async (phone: string, span: { since: Date; until: Date }) =>
      rows.filter((r) => r.phone === phone && inSpan(r, span)),
    attach: async (w: AttachWrite) => {
      const hit = rows.find((r) => r.id === w.id && r.wa_message_id === w.from);
      const taken = rows.some((r) => r.wa_message_id === w.waMessageId);
      if (!hit || taken) return false;
      Object.assign(hit, { wa_message_id: w.waMessageId, sent_at: w.at.toISOString() });
      return true;
    },
  };
}

const attachOf = (rows: ReturnType<typeof row>[]) =>
  new ManualEcho(memoryRepo(rows) as unknown as ManualEchoRepo);
const input = { msg: echo(), phone: PHONE, from: CHAT };

describe('manual echo rules', () => {
  it('folds runs of whitespace and line breaks', () => {
    expect(foldText('  a \n\n b\tc ')).toBe('a b c');
  });

  it('the span: 30 minutes before the echo, 2 minutes after', () => {
    expect(markSpan(ECHO_AT)).toEqual({
      since: new Date('2026-11-06T09:50:00Z'),
      until: new Date('2026-11-06T10:22:00Z'),
    });
  });

  it('never another text, line or number; an unknown line or number does not block', () => {
    const body = 'السلام عليكم موعد الحلقة غدًا';
    const rows = [
      row({ id: 'other-text', body: 'نص آخر' }),
      row({ id: 'other-line', line: 'notifications' }),
      row({ id: 'other-number', number_id: 'num-2' }),
      row({ id: 'unrouted', line: null, number_id: null }),
    ];
    expect(manualMatches(rows, { body, from: CHAT }).map((r) => r.id)).toEqual(['unrouted']);
  });

  it('oldest mark first', () => {
    const rows = [row({ id: 'late', sent_manually_at: '2026-11-06T10:15:00Z' }), row({ id: 'early' })];
    expect(manualMatches(rows, { body: rows[0]?.body ?? '', from: CHAT })[0]?.id).toBe('early');
  });
});

describe('ManualEcho.attach', () => {
  it('the same text within 30 minutes: attached (whitespace folded)', async () => {
    const rows = [row()];
    await expect(attachOf(rows).attach(input)).resolves.toBe(true);
    expect(rows[0]?.wa_message_id).toBe('wamid.APP1');
  });

  it('no match: another text, another phone, a mark older than 30 minutes', async () => {
    const rows = [row({ body: 'نص آخر' }), row({ id: 'm2', phone: '+966500000002' })];
    rows.push(row({ id: 'm3', sent_manually_at: '2026-11-06T09:49:59.000Z' }));
    await expect(attachOf(rows).attach(input)).resolves.toBe(false);
    expect(rows.every((r) => r.wa_message_id === null)).toBe(true);
  });

  it('a file, a template or a marker never attaches', async () => {
    const rows = [row()];
    const svc = attachOf(rows);
    for (const over of [{ mediaId: 'media-1' }, { templateName: 'welcome' }, { payload: { kind: 'edit' } }]) {
      await expect(svc.attach({ msg: echo(over), phone: PHONE, from: CHAT })).resolves.toBe(false);
    }
    expect(rows[0]?.wa_message_id).toBeNull();
  });

  it('replayed: the row already has its wamid, nothing more is attached', async () => {
    const rows = [row(), row({ id: 'm2' })];
    const svc = attachOf(rows);
    await svc.attach({ msg: echo(), phone: PHONE, from: CHAT });
    await expect(svc.attach({ msg: echo(), phone: PHONE, from: CHAT })).resolves.toBe(false);
    expect(rows.map((r) => r.wa_message_id)).toEqual(['wamid.APP1', null]);
  });

  it('two identical texts: each echo takes the next row', async () => {
    const rows = [row(), row({ id: 'm2', sent_manually_at: '2026-11-06T10:11:00.000Z' })];
    const svc = attachOf(rows);
    await svc.attach({ msg: echo(), phone: PHONE, from: CHAT });
    await svc.attach({ msg: echo({ waMessageId: 'wamid.APP2' }), phone: PHONE, from: CHAT });
    expect(rows.map((r) => r.wa_message_id)).toEqual(['wamid.APP1', 'wamid.APP2']);
  });
});

describe('ManualEcho.attach: a row WhatsApp took and then failed (131047 after the fact)', () => {
  it('its old wamid is replaced by the app\'s, sent_at never before the mark', async () => {
    const rows = [row({ wa_message_id: 'wamid.OLD', sent_at: '2026-11-05T09:00:00.000Z' })];
    await expect(attachOf(rows).attach(input)).resolves.toBe(true);
    expect(rows[0]).toMatchObject({ wa_message_id: 'wamid.APP1', sent_at: ECHO_AT.toISOString() });
  });

  it('an echo already on the row (sent_at at or after the mark): never taken again', async () => {
    const rows = [row({ wa_message_id: 'wamid.APP0', sent_at: '2026-11-06T10:10:00.000Z' })];
    await expect(attachOf(rows).attach(input)).resolves.toBe(false);
    expect(rows[0]?.wa_message_id).toBe('wamid.APP0');
  });
});
