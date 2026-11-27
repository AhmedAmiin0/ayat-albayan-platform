import { describe, expect, it } from 'vitest';
import { WA_PROVIDERS, waProviderSchema } from '../keys';

describe('waProviderSchema', () => {
  it('accepts each WhatsApp driver and nothing else', () => {
    expect(waProviderSchema.options).toEqual([...WA_PROVIDERS]);
    expect(waProviderSchema.safeParse('twilio').success).toBe(false);
  });
});
