import { isNotFound } from '@tanstack/react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Route } from '@/routes/(public)/pay.$token';

type BeforeLoad = () => void;
const beforeLoad = Route.options.beforeLoad as unknown as BeforeLoad;

describe('/pay/$token in a normal build', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is the router’s not-found without VITE_FEATURE_STRIPE (before any request)', () => {
    let thrown: unknown = null;
    try {
      beforeLoad();
    } catch (e) {
      thrown = e;
    }
    expect(isNotFound(thrown)).toBe(true);
  });

  it('opens in the Stripe test build', () => {
    vi.stubEnv('VITE_FEATURE_STRIPE', '1');
    expect(() => beforeLoad()).not.toThrow();
  });
});
