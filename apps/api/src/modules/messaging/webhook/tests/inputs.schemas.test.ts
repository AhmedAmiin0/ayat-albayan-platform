import { describe, expect, it } from 'vitest';
import {
  hubQuerySchema,
  kapsoHeadersSchema,
  metaHeadersSchema,
  wacrmHeadersSchema,
} from '@/modules/messaging/webhook/webhook-inputs.schemas';

describe('webhook input schemas — never a 400, an unreadable value reads as absent', () => {
  it('reads the hub handshake and drops a repeated (array) value', () => {
    const q = { 'hub.mode': 'subscribe', 'hub.verify_token': ['a', 'b'], 'hub.challenge': '42' };
    expect(hubQuerySchema.parse(q)).toEqual({
      'hub.mode': 'subscribe',
      'hub.verify_token': undefined,
      'hub.challenge': '42',
    });
    expect(hubQuerySchema.parse({})).toEqual({});
  });

  it('keeps only the signature headers each route reads', () => {
    const headers = { 'x-hub-signature-256': 'sha256=ab', 'x-wacrm-signature': 't=1,v1=ab', host: 'x' };
    expect(metaHeadersSchema.parse(headers)).toEqual({ 'x-hub-signature-256': 'sha256=ab' });
    expect(wacrmHeadersSchema.parse(headers)).toEqual({ 'x-wacrm-signature': 't=1,v1=ab' });
    expect(metaHeadersSchema.parse({ 'x-hub-signature-256': 7 })['x-hub-signature-256'])
      .toBeUndefined();
  });

  it('keeps a Kapso header as a string or a list, as Node gives it', () => {
    const headers = { 'x-webhook-signature': ['a', 'b'], 'x-hub-signature-256': 'sha256=c' };
    expect(kapsoHeadersSchema.parse(headers)).toEqual(headers);
    expect(kapsoHeadersSchema.parse({ 'x-webhook-signature': 1 })['x-webhook-signature'])
      .toBeUndefined();
  });
});
