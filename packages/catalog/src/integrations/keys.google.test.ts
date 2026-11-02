import { describe, expect, it } from 'vitest';
import { integrationValueValid } from './checks.js';
import { integrationDef, isIntegrationKey } from './keys.js';

// Google sync (docs/24 §3): the client id is a plain value, the client secret goes to Vault; the
// refresh token is NOT a registry key (its own Vault entry, never in the form or the env overlay).

describe('Google integration keys', () => {
  it('the client id is plain and the client secret is secret, in the google group', () => {
    expect(integrationDef('GOOGLE_CLIENT_ID')).toMatchObject({ group: 'google', secret: false });
    expect(integrationDef('GOOGLE_CLIENT_SECRET')).toMatchObject({ group: 'google', secret: true });
    expect(isIntegrationKey('GOOGLE_REFRESH_TOKEN')).toBe(false);
  });

  it('accepts only an OAuth client id shape', () => {
    expect(integrationValueValid('GOOGLE_CLIENT_ID', '123456789012-abc123def.apps.googleusercontent.com')).toBe(true);
    expect(integrationValueValid('GOOGLE_CLIENT_ID', 'abc.apps.googleusercontent.com')).toBe(false);
    expect(integrationValueValid('GOOGLE_CLIENT_ID', 'https://evil.example/x')).toBe(false);
  });
});
