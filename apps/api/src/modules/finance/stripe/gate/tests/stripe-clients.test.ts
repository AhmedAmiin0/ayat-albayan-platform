import { describe, expect, it, vi } from 'vitest';
import { stripeFactory } from '@/modules/finance/stripe';

const made = vi.hoisted(() => ({ options: new Array<unknown>() }));

vi.mock('stripe', () => ({
  default: class {
    constructor(_key: string, options: unknown) {
      made.options.push(options);
    }
  },
}));

describe('stripeFactory', () => {
  it('bounds each call at 15 s and keeps the pinned version and the SDK retries', () => {
    stripeFactory('sk_test_bounded');
    expect(made.options).toEqual([
      { apiVersion: expect.any(String), maxNetworkRetries: 2, timeout: 15_000 },
    ]);
  });
});
