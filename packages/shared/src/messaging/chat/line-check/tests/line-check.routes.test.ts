import { describe, expect, it } from 'vitest';
import { lineCheckRoutes as routes, lineCheckViewSchema } from '..';

const VIEW = {
  line: 'notifications',
  configured: true,
  provider: 'crm',
  gaps: [],
  duplicate_chat_phone: false,
  crm_webhook_secret: true,
  crm_send_scope: null,
  crm_template_scopes_missing: ['templates:write'],
  crm_read_scopes_missing: null,
  meta_ready: { app_secret: true, verify_token: false, app_subscribed: null },
  phone_number_id: 'p1',
  waba_id: 'w1',
  app_id: null,
  display_phone_number: '+20 100 000 0001',
  verified_name: 'Academy',
  quality_rating: 'GREEN',
  status: 'CONNECTED',
  name_status: null,
  code_verification_status: null,
  subscribed_apps: [{ id: 'a1', name: null, override_callback_uri: null }],
  errors: [{ step: 'crm_me', code: 401, message: 'refused', credential: 'crm' }],
  checked_at: '2026-10-10T08:00:00.000Z',
};

describe('lineCheckRoutes', () => {
  it('keeps the path of today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual(['POST /messaging/lines/check']);
  });

  it('carries the template managers permission and the messaging tag', () => {
    expect(routes.check.permissions).toEqual(['templates.manage']);
    expect(routes.check.tags).toEqual(['messaging']);
  });

  it('takes no input and answers one view per line', () => {
    expect(routes.check).not.toHaveProperty('body');
    expect(routes.check.response.parse([VIEW])).toEqual([VIEW]);
  });

  it('answers an unconfigured line with every fact null', () => {
    const bare = { ...VIEW, configured: false, subscribed_apps: null, errors: [] };
    expect(lineCheckViewSchema.safeParse(bare).success).toBe(true);
  });

  it('refuses an unknown line, driver, failed step or refused credential', () => {
    const bad = [
      { ...VIEW, line: 'sales' },
      { ...VIEW, provider: 'twilio' },
      { ...VIEW, errors: [{ step: 'token', code: null, message: 'x' }] },
      { ...VIEW, errors: [{ step: 'phone', code: null, message: 'x', credential: 'meta' }] },
      { ...VIEW, checked_at: '10/10/2026' },
    ];
    for (const view of bad) expect(lineCheckViewSchema.safeParse(view).success).toBe(false);
  });
});
