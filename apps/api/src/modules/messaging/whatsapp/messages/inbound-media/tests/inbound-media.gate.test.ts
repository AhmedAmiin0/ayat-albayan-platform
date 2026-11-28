import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { crmLink } from '@/modules/messaging/whatsapp/messages/crm-history/crm-history.fakes';
import {
  chatServable,
  mediaExpired,
  servable,
} from '@/modules/messaging/whatsapp/messages/inbound-media/inbound-media.gate';
import type { MediaMessage } from '@/modules/messaging/whatsapp/messages/inbound-media/inbound-media.types';

const msg = (over: Partial<MediaMessage> = {}): MediaMessage => ({
  id: 'm1',
  phone_e164: '+966500000000',
  direction: 'inbound',
  media_id: 'mid',
  media_mime: 'image/jpeg',
  media_path: null,
  body: null,
  created_at: '2026-10-02T08:00:00Z',
  line: null,
  ...over,
});

const answer = (run: () => unknown): unknown => {
  try {
    run();
    return 'ok';
  } catch (e) {
    return e instanceof HttpException ? [e.getStatus(), e.getResponse()] : e;
  }
};
const GONE = [410, { code: 'media_expired', message: 'media_expired' }];
const NOT_INVOICE = [400, { code: 'invoice_message', message: 'invoice_message' }];

describe('servable (the invoice gate)', () => {
  it('an inbound image or PDF with a Meta id or an old-CRM link', () => {
    expect(answer(() => servable(msg()))).toBe('ok');
    const crm = msg({ media_id: null, body: crmLink(), media_mime: 'application/pdf' });
    expect(answer(() => servable(crm))).toBe('ok');
  });

  it('inbound with a mime but neither source: 410 media_expired', () => {
    expect(answer(() => servable(msg({ media_id: null })))).toEqual(GONE);
  });

  it('outbound, another mime, or no mime and no source: 400 invoice_message', () => {
    expect(answer(() => servable(msg({ direction: 'outbound' })))).toEqual(NOT_INVOICE);
    expect(answer(() => servable(msg({ media_mime: 'audio/ogg' })))).toEqual(NOT_INVOICE);
    expect(answer(() => servable(msg({ media_id: null, media_mime: null })))).toEqual(NOT_INVOICE);
  });

  it('a custom allow list', () => {
    expect(answer(() => servable(msg({ media_mime: 'audio/ogg' }), () => true))).toBe('ok');
  });
});

describe('chatServable', () => {
  it('an echo with a Meta id and a bubble type; 410 without the id; 400 otherwise', () => {
    const echo = msg({ direction: 'outbound', media_mime: 'audio/ogg' });
    expect(answer(() => chatServable(echo))).toBe('ok');
    expect(answer(() => chatServable({ ...echo, media_id: null }))).toEqual(GONE);
    const zip = { ...echo, media_mime: 'application/zip' };
    expect(answer(() => chatServable(zip))).toEqual(NOT_INVOICE);
  });
});

describe('mediaExpired', () => {
  const now = new Date('2026-10-31T08:00:00Z');
  it('past 29 days and never cached', () => {
    expect(mediaExpired({ created_at: '2026-10-01T07:59:59Z', media_path: null }, now)).toBe(true);
    expect(mediaExpired({ created_at: '2026-10-02T08:00:00Z', media_path: null }, now)).toBe(false);
    expect(mediaExpired({ created_at: '2026-01-01T00:00:00Z', media_path: 'p' }, now)).toBe(false);
  });
});
