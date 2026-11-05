import { afterEach, describe, expect, it, vi } from 'vitest';
import { CrmWhatsappClient } from '@/modules/messaging/whatsapp/drivers/crm/crm.client';
import { CRM_ENV } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import { HttpWhatsappClient } from '@/modules/messaging/whatsapp/whatsapp.client';
import { RECORDED, scriptedFetch, STUB_ENV } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { relayFailure } from './relay.errors';
import { relayCrmBody } from './relay.kinds';
import { RelayLine, relaySender } from './relay.line';
import { relayRequestSchema } from './relay.schema';

// docs/19 «CRM → Meta»: the script relay sends through the notifications line's CURRENT driver; the
// script's key is still checked against the CRM account (WACRM_*), so its API does not change.

afterEach(() => vi.unstubAllEnvs());

function line(provider: 'crm' | 'meta', crmKey = 'fake-crm-key') {
  vi.stubEnv('WA_PROVIDER', provider);
  vi.stubEnv('WA_API_BASE', 'http://127.0.0.1:4010');
  vi.stubEnv('WA_PHONE_NUMBER_ID', 'stub-phone');
  vi.stubEnv('WA_WABA_ID', 'stub-waba');
  vi.stubEnv('WA_ACCESS_TOKEN', 'test-token');
  vi.stubEnv('WACRM_API_BASE', 'http://127.0.0.1:4010/crm/api/v1');
  vi.stubEnv('WACRM_API_KEY', crmKey);
  vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', '');
}

const SCRIPT = {
  to: '966500000001',
  type: 'template',
  template: {
    name: 'lesson_reminder_v2',
    language: 'ar',
    params: { body: ['سارة', '17:00'], buttonParams: { '0': 'room-1' } },
  },
};

describe('RelayLine.current', () => {
  it('a crm line: the crm driver, the CRM env for the key check', () => {
    line('crm');
    const now = new RelayLine().current();
    expect(now?.client).toBeInstanceOf(CrmWhatsappClient);
    expect(now?.env).toMatchObject({ provider: 'crm', apiKey: 'fake-crm-key' });
  });

  it('a meta line: the Graph driver, the key still checked against the CRM account', () => {
    line('meta');
    const now = new RelayLine().current();
    expect(now?.client).toBeInstanceOf(HttpWhatsappClient);
    expect(now?.env).toMatchObject({ provider: 'crm', apiKey: 'fake-crm-key' });
  });

  it('no CRM key to check the script against: unavailable (503), whatever the driver', () => {
    line('meta', '');
    expect(new RelayLine().current()).toBeNull();
  });
});

describe('relaySender on a meta line', () => {
  it('the script\'s template as Graph\'s: name, language, body values, URL button by index', async () => {
    const f = scriptedFetch(RECORDED.sendOk);
    const sender = relaySender(STUB_ENV, null);
    const graph = new HttpWhatsappClient(STUB_ENV, { fetch: f.fetch });
    expect(sender).toBeInstanceOf(HttpWhatsappClient);
    await graph.sendBody(relayCrmBody(relayRequestSchema.parse(SCRIPT)));
    expect(f.requests[0]?.url).toBe('http://127.0.0.1:4010/v21.0/stub-phone/messages');
    expect(f.requests[0]?.body).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '966500000001',
      type: 'template',
      template: {
        name: 'lesson_reminder_v2',
        language: { code: 'ar' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: 'سارة' }, { type: 'text', text: '17:00' }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: 'room-1' }] },
        ],
      },
    });
  });

  it('text and a document by link, as Meta\'s own message types', async () => {
    const f = scriptedFetch(RECORDED.sendOk, RECORDED.sendOk);
    const graph = new HttpWhatsappClient(STUB_ENV, { fetch: f.fetch });
    await graph.sendBody(relayCrmBody(relayRequestSchema.parse({ to: SCRIPT.to, type: 'text', text: 'مرحبًا' })));
    const doc = { to: SCRIPT.to, type: 'document', link: 'https://files.example/r.pdf', filename: 'r.pdf', caption: 'تقرير' };
    await graph.sendBody(relayCrmBody(relayRequestSchema.parse(doc)));
    expect(f.requests[0]?.body).toMatchObject({ type: 'text', text: { body: 'مرحبًا' } });
    expect(f.requests[1]?.body).toMatchObject({
      type: 'document',
      document: { link: 'https://files.example/r.pdf', filename: 'r.pdf', caption: 'تقرير' },
    });
  });

  it('a crm line env gets the crm driver', () => {
    expect(relaySender(CRM_ENV, null)).toBeInstanceOf(CrmWhatsappClient);
  });
});

describe('relayFailure on a meta line', () => {
  it('Meta refusing the line\'s own token is 502 line_auth, never the script\'s 401', () => {
    const dead = relayFailure(new WaError('Invalid OAuth access token', { code: 190, status: 401 }));
    expect(dead).toMatchObject({ status: 502, code: 'line_auth', maybe: false });
    const refused = relayFailure(new WaError('missing', { code: 132001, status: 404 }));
    expect(refused).toMatchObject({ status: 404, maybe: false });
  });
});
