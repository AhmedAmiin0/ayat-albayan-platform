import type { UserRole } from '@ab/catalog';
import type { HttpEnv } from '@ab/web-kit/testing';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { familyHostUrl, leaveForFamilyHost } from './family-host';

interface Fake {
  role: UserRole | null;
  fails: boolean;
}
const env = vi.hoisted(() => ({ familyOrigin: '' }));
const me: Fake = vi.hoisted(() => ({ role: null, fails: false }));
const signOut = vi.hoisted(() => vi.fn(async () => undefined));
// The kit root also builds the Supabase client from env when it loads.
vi.mock('@ab/web-kit/lib/http/env/env', async (importOriginal) => {
  const actual = await importOriginal<typeof HttpEnv>();
  return { ...actual, env: Object.assign(env, { ...actual.env, ...env }) };
});
vi.mock('@ab/web-kit/auth/sign-in/sign-in', () => ({ signOut }));
vi.mock('@ab/web-kit/auth/me/me', async () => {
  const { pathKey } = await import('@ab/client-core');
  return {
    meQuery: {
      queryKey: pathKey('/auth/me'),
      queryFn: async () => {
        if (me.fails) throw new Error('503');
        return me.role ? { role: me.role } : null;
      },
    },
  };
});

const FAMILY = 'https://family.example.test';
const PORTAL = { path: '/portal', signedOutIsFamily: true };
const ACCOUNT = { path: '/account', signedOutIsFamily: false };
const replace = vi.fn();
const standalone = { matches: false };
const leave = (page = PORTAL) => leaveForFamilyHost(new QueryClient(), page);

beforeEach(() => {
  env.familyOrigin = FAMILY;
  me.role = 'guardian';
  me.fails = false;
  standalone.matches = false;
  vi.stubGlobal('location', { origin: 'https://app.example.test', replace });
  vi.stubGlobal('matchMedia', () => standalone);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('familyHostUrl (docs/51 §3)', () => {
  it('no host set, or already on it: no move', () => {
    env.familyOrigin = '';
    expect(familyHostUrl('/portal', 'https://app.example.test')).toBeNull();
    env.familyOrigin = FAMILY;
    expect(familyHostUrl('/portal', FAMILY)).toBeNull();
  });

  it('else the same path and search on the family host', () => {
    expect(familyHostUrl('/portal?x=1', 'https://app.example.test')).toBe(`${FAMILY}/portal?x=1`);
  });
});

describe('leaveForFamilyHost', () => {
  it('a guardian, a student or a signed-out visitor of /portal: signed out, then sent', async () => {
    for (const role of ['guardian', 'student', null] as const) {
      me.role = role;
      await expect(leave()).resolves.toBe(`${FAMILY}/portal`);
    }
    expect(signOut).toHaveBeenCalledTimes(3);
    expect(replace).toHaveBeenCalledWith(`${FAMILY}/portal`);
  });

  it('staff stay; a signed-out /account stays; a failed read never moves anyone', async () => {
    me.role = 'teacher';
    await expect(leave(ACCOUNT)).resolves.toBeNull();
    me.role = null;
    await expect(leave(ACCOUNT)).resolves.toBeNull();
    me.fails = true;
    await expect(leave()).resolves.toBeNull();
    expect(signOut).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('a student on /account moves; nobody moves while no host is set', async () => {
    me.role = 'student';
    await expect(leave(ACCOUNT)).resolves.toBe(`${FAMILY}/account`);
    env.familyOrigin = '';
    await expect(leave()).resolves.toBeNull();
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('an installed app gets the link for a notice, no silent jump', async () => {
    standalone.matches = true;
    await expect(leave()).resolves.toBe(`${FAMILY}/portal`);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });
});
