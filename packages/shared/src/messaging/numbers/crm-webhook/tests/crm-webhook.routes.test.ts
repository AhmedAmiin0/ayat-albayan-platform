import { describe, expect, it } from 'vitest';
import { crmWebhookRefusalSchema, crmWebhookRoutes as routes } from '..';

const ANSWER = {
  data: {
    id: 'w-1',
    url: 'https://api.test.example/webhooks/wacrm',
    events: ['message.status_updated', 'message.received'],
    replaced: 0,
  },
};

describe('crmWebhookRoutes', () => {
  it('keeps the path of today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual(['POST /settings/integrations/crm-webhook']);
  });

  it('carries the settings write permission and the settings tag', () => {
    expect(routes.register.permissions).toEqual(['settings.write']);
    expect(routes.register.tags).toEqual(['settings']);
  });

  it('takes no input and answers the endpoint, never its secret', () => {
    expect(routes.register).not.toHaveProperty('body');
    const withSecret = { data: { ...ANSWER.data, secret: 'whsec_0123456789abcdef' } };
    expect(routes.register.response.parse(withSecret)).toEqual(ANSWER);
  });

  it('refuses an answer without its endpoint or with a negative count', () => {
    const negative = { data: { ...ANSWER.data, replaced: -1 } };
    const bad = [{}, negative, { data: { ...ANSWER.data, url: 1 } }];
    const refused = bad.filter((answer) => !routes.register.response.safeParse(answer).success);
    expect(refused).toEqual(bad);
  });

  it('names every refusal by its code', () => {
    expect(crmWebhookRefusalSchema.options).toEqual([
      'crm_line_required',
      'crm_base_insecure',
      'public_url_required',
      'crm_key_refused',
      'crm_scope_missing',
      'crm_failed',
      'crm_bad_answer',
      'secret_store_failed',
    ]);
  });
});
