import { waIdToE164 } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { LineNumbers } from '../../../config/env/env';
import {
  buttonPart,
  CHAT_PHONE_NUMBER_ID,
  envelope,
  inboundValue,
  interactivePart,
  mediaPart,
  PHONE_NUMBER_ID,
  statusValue,
  textPart,
  TS_DATE,
} from '../meta.fakes';
import { metaTime, parseWebhook } from './webhook.parse';

const NOW = new Date('2026-10-03T13:05:00Z');
const ONE: LineNumbers = { notifications: PHONE_NUMBER_ID };
const TWO: LineNumbers = { notifications: PHONE_NUMBER_ID, chat: CHAT_PHONE_NUMBER_ID };
const parse = (value: object, numbers: LineNumbers = ONE) => parseWebhook(envelope(value), { now: NOW, numbers });

describe('parseWebhook — inbound messages', () => {
  it('reads a text message with the profile name and Meta’s timestamp', () => {
    const [m] = parse(inboundValue(textPart('السلام عليكم'))).messages;
    expect(m).toEqual({
      waMessageId: 'wamid.IN1',
      from: '966501234567',
      name: 'أم سهيلة',
      at: TS_DATE,
      type: 'text',
      body: 'السلام عليكم',
      replyKey: null,
      replyTo: null,
      mediaId: null,
      mediaMime: null,
      payload: null,
      line: null,
    });
  });

  it('reads a template quick-reply button: text, payload and the wamid it answers', () => {
    const value = inboundValue(buttonPart('تمام، هنحضر', 'confirm:lesson-1'), { context: 'wamid.OUT1' });
    const [m] = parse(value).messages;
    expect(m).toMatchObject({ type: 'button', body: 'تمام، هنحضر', replyKey: 'confirm:lesson-1', replyTo: 'wamid.OUT1' });
    expect(m?.payload).toEqual({ type: 'button', button: { text: 'تمام، هنحضر', payload: 'confirm:lesson-1' } });
  });

  it('reads interactive button and list replies', () => {
    const [b] = parse(inboundValue(interactivePart('stop:lead-1', 'وقف الرسايل'))).messages;
    expect(b).toMatchObject({ type: 'interactive', body: 'وقف الرسايل', replyKey: 'stop:lead-1' });
    const list = { type: 'interactive', interactive: { type: 'list_reply', list_reply: { id: 'r1', title: 'السبت' } } };
    expect(parse(inboundValue(list)).messages[0]).toMatchObject({ body: 'السبت', replyKey: 'r1' });
  });

  it.each(['image', 'audio', 'video', 'document', 'sticker'])('keeps the media id and mime of a %s', (kind) => {
    const [m] = parse(inboundValue(mediaPart(kind, { caption: 'الواجب' }))).messages;
    expect(m).toMatchObject({ type: kind, mediaId: 'media-1', mediaMime: 'image/jpeg', body: 'الواجب' });
    expect(m?.payload).toMatchObject({ type: kind });
  });

  it('stores an unsupported or location message raw, with no body', () => {
    const unsupported = { type: 'unsupported', errors: [{ code: 131051, title: 'Message type unknown' }] };
    const [u] = parse(inboundValue(unsupported)).messages;
    expect(u).toMatchObject({ type: 'unsupported', body: null, mediaId: null });
    expect(u?.payload).toEqual({ type: 'unsupported', unsupported: null, errors: unsupported.errors });
    const location = { type: 'location', location: { latitude: 24.7, longitude: 46.7 } };
    expect(parse(inboundValue(location)).messages[0]?.payload).toEqual(location);
  });

  it.each([
    ['966501234567', '+966501234567'],
    ['201001234567', '+201001234567'],
    ['971501234567', '+971501234567'],
  ])('wa_id %s → %s', (waId, e164) => {
    const [m] = parse(inboundValue(textPart('hi'), { from: waId })).messages;
    expect(m?.from).toBe(waId);
    expect(waIdToE164(m?.from ?? '')).toBe(e164);
  });
});

describe('parseWebhook — statuses', () => {
  it('reads sent/delivered with conversation and pricing', () => {
    const [s] = parse(statusValue({ status: 'delivered' })).statuses;
    expect(s).toEqual({
      waMessageId: 'wamid.OUT1',
      status: 'delivered',
      at: TS_DATE,
      errorCode: null,
      errorText: null,
      conversationId: 'conv-966501234567',
      pricingCategory: 'utility',
    });
  });

  it('reads read and failed with the error code', () => {
    expect(parse(statusValue({ status: 'read' })).statuses[0]?.status).toBe('read');
    const [f] = parse(statusValue({ status: 'failed', errorCode: 131047 })).statuses;
    expect(f).toMatchObject({ status: 'failed', errorCode: '131047', errorText: 'Message undeliverable' });
  });
});

describe('parseWebhook — envelope', () => {
  it('ignores garbage, other fields, unknown statuses and malformed items', () => {
    expect(parseWebhook('nope', { now: NOW })).toEqual({ messages: [], statuses: [] });
    expect(parseWebhook({ entry: 'x' }, { now: NOW })).toEqual({ messages: [], statuses: [] });
    const other = { entry: [{ changes: [{ field: 'account_update', value: inboundValue(textPart('x')) }] }] };
    expect(parseWebhook(other, { now: NOW }).messages).toEqual([]);
    expect(parse({ statuses: [{ id: 'w', status: 'deleted' }, { status: 'read' }] }).statuses).toEqual([]);
    expect(parse({ messages: [{ id: 'no-from', type: 'text' }] }).messages).toEqual([]);
  });

  it('ignores changes for another phone number of the WABA unless no number is configured', () => {
    const body = envelope(inboundValue(textPart('x')), 'someone-else');
    expect(parseWebhook(body, { now: NOW, numbers: ONE }).messages).toEqual([]);
    expect(parseWebhook(body, { now: NOW, numbers: {} }).messages).toHaveLength(1);
  });

  it('skips an unknown number for messages AND statuses and reports it via onIgnored', () => {
    const onIgnored = vi.fn();
    const value = { ...inboundValue(textPart('x')), ...statusValue({ status: 'read' }) };
    expect(parseWebhook(envelope(value, 'someone-else'), { now: NOW, numbers: TWO, onIgnored })).toEqual({ messages: [], statuses: [] });
    expect(onIgnored).toHaveBeenCalledExactlyOnceWith('someone-else');
  });

  it('accepts a change with no metadata phone_number_id (line null)', () => {
    const body = { entry: [{ changes: [{ field: 'messages', value: inboundValue(textPart('x')) }] }] };
    const onIgnored = vi.fn();
    expect(parseWebhook(body, { now: NOW, numbers: TWO, onIgnored }).messages).toEqual([expect.objectContaining({ line: null })]);
    expect(onIgnored).not.toHaveBeenCalled();
  });

  it('stamps the receiving line only while the chat line is configured', () => {
    expect(parse(inboundValue(textPart('x')), TWO).messages[0]?.line).toBe('notifications');
    const chat = parseWebhook(envelope(inboundValue(textPart('x')), CHAT_PHONE_NUMBER_ID), { now: NOW, numbers: TWO });
    expect(chat.messages[0]?.line).toBe('chat');
    expect(parse(statusValue({ status: 'read' }), TWO).statuses).toHaveLength(1);
    expect(parse(inboundValue(textPart('x')), ONE).messages[0]?.line).toBeNull();
  });

  it('metaTime falls back to now for a missing or bad timestamp', () => {
    expect(metaTime(undefined, NOW)).toBe(NOW);
    expect(metaTime('abc', NOW)).toBe(NOW);
    expect(metaTime('1791032400', NOW)).toEqual(TS_DATE);
  });
});
