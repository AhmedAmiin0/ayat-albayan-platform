import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { integrationIdentifier, newLinkToken, uuidFor } from './link-ids';

describe('payment link ids', () => {
  it('a token is 43 url-safe characters and never repeats', () => {
    const a = newLinkToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newLinkToken()).not.toBe(a);
  });

  it('integration_identifier: the fixed prefix and 8 random letters', () => {
    expect(integrationIdentifier()).toMatch(/^ayat-sales-link-[a-z]{8}$/);
  });

  it('uuidFor: a valid, stable uuid per Stripe id', () => {
    const id = uuidFor('cs_test_123');
    expect(z.uuid().safeParse(id).success).toBe(true);
    expect(uuidFor('cs_test_123')).toBe(id);
    expect(uuidFor('re_123')).not.toBe(id);
  });
});
