import { describe, expect, it, vi } from 'vitest';
import { CALLS_LINE_ENV } from '../calls-number.fakes';
import { KapsoCallsApi } from './kapso-calls';
import { permissionRequestBody, permissionTemplate } from './permission-body';

const LINE = { env: CALLS_LINE_ENV, numberId: 'n-calls', calls: true as const };

describe('the call permission request from the calls number (docs/28 §10)', () => {
  it('calls_permission_template: «name» (Arabic) or «name:language»; empty or not a template name = null', () => {
    expect(permissionTemplate('call_permission_ar')).toEqual({ name: 'call_permission_ar', language: 'ar' });
    expect(permissionTemplate(' call_perm:en_US ')).toEqual({ name: 'call_perm', language: 'en_US' });
    expect([permissionTemplate(''), permissionTemplate(null), permissionTemplate('Bad Name'), permissionTemplate('x:arabic')]).toEqual([null, null, null, null]);
  });

  it('the interactive inside the window; the template, without parameters, outside it', () => {
    expect(permissionRequestBody({ to: '+201001234567', text: 'نص' })).toMatchObject({
      to: '201001234567', type: 'interactive', interactive: { type: 'call_permission_request', body: { text: 'نص' } },
    });
    expect(permissionRequestBody({ to: '+201001234567', template: { name: 't', language: 'ar' } })).toEqual({
      messaging_product: 'whatsapp', recipient_type: 'individual', to: '201001234567', type: 'template', template: { name: 't', language: { code: 'ar' } },
    });
  });

  it('one POST /{calls phone_number_id}/messages with the project key (fake fetch; no hosted call)', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ messages: [{ id: 'wamid.P' }] }), { status: 200 }));
    const api = new KapsoCallsApi({ fetch, timeoutMs: 1000 });
    await expect(api.requestPermission(LINE, { to: '+201001234567', text: 'x' })).resolves.toEqual({ waMessageId: 'wamid.P' });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://stub.test/kapso/v24.0/calls-pn/messages');
    expect(init.headers).toMatchObject({ 'x-api-key': 'k' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
