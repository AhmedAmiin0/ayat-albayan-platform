import { describe, expect, it } from 'vitest';
import { OWN_PUBLIC } from '@/common/auth/decorators';
import { RelayController } from '@/modules/messaging/whatsapp/relay/relay.controller';
import { relayRoutes as routes } from '@/modules/messaging/whatsapp/relay/relay.routes';

const ME = { data: { account: { name: 'relay' }, key: { scopes: ['messages:send'] } } };
const SENT = { data: { message_id: 'm-1', whatsapp_message_id: null } };

describe('relayRoutes', () => {
  it('keeps the paths of today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual(['GET /script-relay/api/v1/me', 'POST /script-relay/api/v1/messages']);
  });

  it('tags both webhooks, marks them public and asks no permission of the script', () => {
    for (const route of Object.values(routes)) {
      expect(route.tags).toEqual(['webhooks']);
      expect(route.isPublic).toBe(true);
      expect(route).not.toHaveProperty('permissions');
    }
  });

  it('leaves the public mark to the route objects, not to the controller', () => {
    expect(Reflect.getMetadata(OWN_PUBLIC, RelayController)).toBeUndefined();
  });

  it('leaves the body to the controller, parsed after the key check in the CRM wording', () => {
    for (const route of Object.values(routes)) expect(route).not.toHaveProperty('body');
  });

  it('answers the account and its scopes, and the sent message ids', () => {
    expect(routes.me.response.parse(ME)).toEqual(ME);
    expect(routes.send.response.parse(SENT)).toEqual(SENT);
  });

  it('refuses a sent answer without its message id', () => {
    const bad = [{}, { data: { whatsapp_message_id: 'w-1' } }, { data: { message_id: 1 } }];
    const refused = bad.filter((answer) => !routes.send.response.safeParse(answer).success);
    expect(refused).toEqual(bad);
  });
});
