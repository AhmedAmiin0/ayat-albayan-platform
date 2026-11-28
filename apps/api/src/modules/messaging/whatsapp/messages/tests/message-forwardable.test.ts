import { describe, expect, it } from 'vitest';
import { crmLink } from '@/modules/messaging/whatsapp/messages/crm-history/crm-history.fakes';
import { isForwardable } from '@/modules/messaging/whatsapp/messages/message-forwardable';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';

const row = (over: Parameters<typeof messageRow>[0]) =>
  messageRow({ template_key: null, template_params: null, body: 'أهلًا', ...over });
const fresh = () => new Date().toISOString();

describe('isForwardable', () => {
  it('never a template row', () => {
    expect(isForwardable(row({ template_key: 'trial_reminder' }))).toBe(false);
  });

  it('outbound: our stored file, a fetchable echo, or a text; never an empty row', () => {
    expect(isForwardable(row({ body: null, media_path: 'out/a/b/c.pdf' }))).toBe(true);
    const echo = { body: '[audio]', media_id: 'mid', media_mime: 'audio/ogg' };
    expect(isForwardable(row({ ...echo, created_at: fresh() }))).toBe(true);
    expect(isForwardable(row({ ...echo, created_at: '2020-01-01T00:00:00Z' }))).toBe(false);
    expect(isForwardable(row({}))).toBe(true);
    expect(isForwardable(row({ body: '  ' }))).toBe(false);
    expect(isForwardable(row({ body: 'x', media_mime: 'image/png' }))).toBe(false);
  });

  it('inbound with media: only while it can still be fetched, in a bubble type', () => {
    const inbound = { direction: 'inbound', body: null, media_mime: 'audio/ogg' } as const;
    expect(isForwardable(row({ ...inbound, media_id: 'mid', created_at: fresh() }))).toBe(true);
    expect(isForwardable(row({ ...inbound, media_path: 'in/a.ogg', created_at: fresh() }))).toBe(
      true,
    );
    const old = { ...inbound, media_id: 'mid', created_at: '2020-01-01T00:00:00Z' };
    expect(isForwardable(row(old))).toBe(false);
    const zip = { ...inbound, media_id: 'mid', media_mime: 'application/zip' };
    expect(isForwardable(row({ ...zip, created_at: fresh() }))).toBe(false);
  });

  it('inbound without media: an old-CRM file of a bubble type, else a non-blank text', () => {
    const crm = { direction: 'inbound', body: crmLink(), media_mime: 'audio/ogg' } as const;
    expect(isForwardable(row(crm))).toBe(true);
    expect(isForwardable(row({ ...crm, media_mime: 'application/zip' }))).toBe(false);
    expect(isForwardable(row({ direction: 'inbound', body: 'سلام' }))).toBe(true);
    expect(isForwardable(row({ direction: 'inbound', body: ' ' }))).toBe(false);
  });
});
