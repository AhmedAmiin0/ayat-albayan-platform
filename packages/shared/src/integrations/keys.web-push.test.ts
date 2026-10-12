import { describe, expect, it } from 'vitest';
import { integrationValueValid } from './checks.js';
import { INTEGRATION_GROUPS, integrationDef } from './keys.js';

const PUBLIC_KEY = `B${'A'.repeat(86)}`;

describe('web push keys (R-NOT-02)', () => {
  it('form a web_push group with a secret private key', () => {
    expect(INTEGRATION_GROUPS).toContain('web_push');
    expect(integrationDef('WEB_PUSH_VAPID_PUBLIC_KEY')).toMatchObject({ group: 'web_push', secret: false });
    expect(integrationDef('WEB_PUSH_SUBJECT')).toMatchObject({ group: 'web_push', secret: false });
    expect(integrationDef('WEB_PUSH_VAPID_PRIVATE_KEY')).toMatchObject({ group: 'web_push', secret: true });
  });

  it('check the public key (87 base64url chars) and the subject (mailto: or https:)', () => {
    expect(integrationValueValid('WEB_PUSH_VAPID_PUBLIC_KEY', PUBLIC_KEY)).toBe(true);
    expect(integrationValueValid('WEB_PUSH_VAPID_PUBLIC_KEY', `${PUBLIC_KEY}=`)).toBe(false);
    expect(integrationValueValid('WEB_PUSH_VAPID_PUBLIC_KEY', 'short')).toBe(false);
    expect(integrationValueValid('WEB_PUSH_SUBJECT', 'mailto:admin@example.com')).toBe(true);
    expect(integrationValueValid('WEB_PUSH_SUBJECT', 'https://example.com/contact')).toBe(true);
    expect(integrationValueValid('WEB_PUSH_SUBJECT', 'http://example.com')).toBe(false);
    expect(integrationValueValid('WEB_PUSH_SUBJECT', 'admin@example.com')).toBe(false);
  });
});
