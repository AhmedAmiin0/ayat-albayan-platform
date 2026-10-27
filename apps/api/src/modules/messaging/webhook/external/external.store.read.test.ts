import type { TablesInsert } from '@ab/db';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { services } from '../webhook.fakes';
import { kapsoText, SENT_AT } from './external.fakes';

// A reply sent from the WhatsApp Business app (echo) or the old CRM (Kapso history) answers the chat:
// the phone's earlier unread inbound rows are stamped read, as WhatsApp does on the phone.

const PHONE = '+966501234567';
const OTHER = '+966509999999';
const at = (ms: number) => new Date(SENT_AT.getTime() + ms).toISOString();
const inbound = (id: string, created: string, phone = PHONE): TablesInsert<'messages'> => ({
  direction: 'inbound', phone_e164: phone, wa_message_id: id, created_at: created, read_at: null,
});
const from = { line: 'chat' as const, numberId: 'num-1' };

function seeded() {
  const s = services();
  s.queries.stored.push(inbound('wamid.IN1', at(-180_000)), inbound('wamid.IN2', at(-1_000)));
  s.queries.stored.push(inbound('wamid.LATER', at(60_000)), inbound('wamid.OTHER', at(-60_000), OTHER));
  return s;
}
const readOf = (s: ReturnType<typeof services>, id: string) => s.queries.stored.find((r) => r.wa_message_id === id)?.read_at;

afterEach(() => vi.useRealTimers());

describe('ExternalStore: a reply from the app or the CRM marks the chat read', () => {
  it('an app echo stamps the earlier inbound rows read at the reply\'s time; never a later row or another phone', async () => {
    const s = seeded();
    const echo = kapsoText({ id: 'wamid.ECHO1', kapso: undefined });
    expect(await s.external.store.store({ message: echo, from })).toBe('stored');
    expect(readOf(s, 'wamid.IN1')).toBe(SENT_AT.toISOString());
    expect(readOf(s, 'wamid.IN2')).toBe(SENT_AT.toISOString());
    expect(readOf(s, 'wamid.LATER')).toBeNull();
    expect(readOf(s, 'wamid.OTHER')).toBeNull();
    expect(s.external.ext.markAnsweredRead).toHaveBeenCalledWith(PHONE, SENT_AT, SENT_AT);
  });

  it('a CRM reply (Kapso history, the catch-up path) counts too', async () => {
    const s = seeded();
    expect(await s.external.store.store({ message: kapsoText(), from })).toBe('stored');
    expect(readOf(s, 'wamid.IN1')).toBe(SENT_AT.toISOString());
  });

  it('a template sent from the app counts (the chat was answered)', async () => {
    const s = seeded();
    const template = kapsoText({ id: 'wamid.TPL1', type: 'template', text: undefined, template: { name: 'lesson_reminder_v2' }, kapso: undefined });
    expect(await s.external.store.store({ message: template, from })).toBe('stored');
    expect(readOf(s, 'wamid.IN2')).toBe(SENT_AT.toISOString());
  });

  it('the platform\'s own automatic send (its row already holds the wamid) is not a reply: nothing stamped', async () => {
    const s = seeded();
    s.queries.stored.push({ direction: 'outbound', phone_e164: PHONE, wa_message_id: 'wamid.AUTO1', created_by: null, attempts: 1 });
    expect(await s.external.store.store({ message: kapsoText({ id: 'wamid.AUTO1' }), from })).toBe('known');
    expect(s.external.ext.markAnsweredRead).not.toHaveBeenCalled();
    expect(readOf(s, 'wamid.IN1')).toBeNull();
  });

  it('our sign-in code (no row, adopted from Kapso\'s status) is not a reply: stored, nothing stamped', async () => {
    const s = seeded();
    const code = kapsoText({ id: 'wamid.CODE1', type: 'template', text: undefined, template: { name: 'account_code' } });
    expect(await s.external.store.store({ message: code, from })).toBe('stored');
    expect(s.external.ext.markAnsweredRead).not.toHaveBeenCalled();
    expect(readOf(s, 'wamid.IN1')).toBeNull();
  });

  it('a family message of the reply\'s own second may be newer: it stays unread', async () => {
    const s = seeded();
    s.queries.stored.push(inbound('wamid.SAME', at(0)));
    await s.external.store.store({ message: kapsoText({ id: 'wamid.ECHO3', kapso: undefined }), from });
    expect(readOf(s, 'wamid.SAME')).toBeNull();
    expect(readOf(s, 'wamid.IN2')).toBe(at(1)); // the reply, ordered after SAME within its second
  });

  it('an inbound history item is never a reply', async () => {
    const s = seeded();
    const item = kapsoText({ id: 'wamid.IN9', kapso: { direction: 'inbound' } });
    expect(await s.external.store.store({ message: item, from })).toBe('skipped');
    expect(s.external.ext.markAnsweredRead).not.toHaveBeenCalled();
  });

  it('idempotent on replay: the same wamid twice stamps once and changes nothing more', async () => {
    const s = seeded();
    const echo = kapsoText({ id: 'wamid.ECHO1', kapso: undefined });
    await s.external.store.store({ message: echo, from });
    const after = s.queries.stored.map((r) => r.read_at);
    expect(await s.external.store.store({ message: echo, from })).toBe('known');
    expect(s.external.ext.markAnsweredRead).toHaveBeenCalledTimes(1);
    expect(s.queries.stored.map((r) => r.read_at)).toEqual(after);
  });

  it('a reply time ahead of the clock is stamped at now', async () => {
    vi.useFakeTimers({ now: new Date(SENT_AT.getTime() - 120_000), toFake: ['Date'] });
    const s = seeded();
    await s.external.store.store({ message: kapsoText({ id: 'wamid.ECHO2', kapso: undefined }), from });
    expect(readOf(s, 'wamid.IN1')).toBe(at(-120_000));
    expect(readOf(s, 'wamid.IN2')).toBe(at(-120_000));
  });
});
