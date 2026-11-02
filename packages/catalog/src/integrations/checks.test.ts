import { describe, expect, it } from 'vitest';
import { integrationSecretSchema, integrationValuesSchema, integrationValueValid } from './checks.js';
import { EMPTY_RECIPIENTS, parseAllowedRecipients } from './recipients.js';

describe('plain value checks', () => {
  it('accepts what the API env accepts and refuses the rest', () => {
    expect(integrationValueValid('WA_API_BASE', 'https://graph.facebook.com')).toBe(true);
    expect(integrationValueValid('WA_API_BASE', 'not a url')).toBe(false);
    expect(integrationValueValid('WA_API_VERSION', 'v22.0')).toBe(true);
    expect(integrationValueValid('WA_API_VERSION', '22')).toBe(false);
    expect(integrationValueValid('WA_TEMPLATE_SYNC', 'false')).toBe(true);
    expect(integrationValueValid('WA_TEMPLATE_SYNC', 'maybe')).toBe(false);
    expect(integrationValueValid('WA_ALLOWED_RECIPIENTS', '+966500000001, 201001234567')).toBe(true);
    expect(integrationValueValid('WA_ALLOWED_RECIPIENTS', '+9665, x')).toBe(false);
    expect(integrationValueValid('LIVEKIT_URL', 'wss://live.example.org')).toBe(true);
    expect(integrationValueValid('WA_WABA_ID', ' ')).toBe(false);
  });

  it('allowed recipients: normalised, de-duplicated, fail closed', () => {
    expect(parseAllowedRecipients('+20 100 123 4567, 201001234567,')).toEqual({ items: ['+201001234567'], bad: null });
    expect(parseAllowedRecipients(' , ')).toEqual({ items: [], bad: EMPTY_RECIPIENTS });
    expect(parseAllowedRecipients('+1, +966500000001').bad).toBe('+1');
  });
});

describe('PUT /settings/integrations body', () => {
  it('trims, turns blank into null (clear), and names a bad key in the issue path', () => {
    expect(integrationValuesSchema.parse({ values: { WA_WABA_ID: ' 123 ', FX_API_URL: '', WA_APP_ID: null } }).values).toEqual({
      WA_WABA_ID: '123',
      FX_API_URL: null,
      WA_APP_ID: null,
    });
    const bad = integrationValuesSchema.safeParse({ values: { WA_API_BASE: 'nope', WA_ACCESS_TOKEN: 'x', PORT: '1' } });
    expect(bad.success).toBe(false);
    const paths = bad.error?.issues.map((i) => i.path.join('.')) ?? [];
    expect(paths.sort()).toEqual(['values.PORT', 'values.WA_ACCESS_TOKEN', 'values.WA_API_BASE']);
  });

  it('a secret body needs one non-blank value', () => {
    expect(integrationSecretSchema.safeParse({ value: '  ' }).success).toBe(false);
    expect(integrationSecretSchema.parse({ value: ' abc ' })).toEqual({ value: 'abc' });
  });
});
