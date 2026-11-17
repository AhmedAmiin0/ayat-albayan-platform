import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LinkUserRow } from './link-users.repo';
import { diffUsers, expiryOf, managedHosts } from './managed.rules';

const NOW = new Date('2026-11-17T12:00:00Z');
const row = (id: string, over: Partial<LinkUserRow>): LinkUserRow => ({
  id,
  code: 'Ab12Cd34Ef',
  profile_id: null,
  phone_e164: null,
  added_by: null,
  send_status: 'queued',
  send_error: null,
  send_attempts: 1,
  sent_at: null,
  created_at: NOW.toISOString(),
  ...over,
});

describe('managed link rules (docs/19)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('the allow-list: our origins, the API, Meet, plus the extra hosts of «القيم»', () => {
    vi.stubEnv('API_PUBLIC_URL', 'https://api.example.com');
    const hosts = managedHosts(
      'https://app.example.com,https://admin.example.com',
      'forms.example.org, x',
    );
    expect([...hosts].sort()).toEqual([
      'admin.example.com',
      'api.example.com',
      'app.example.com',
      'forms.example.org',
      'meet.google.com',
    ]);
    expect(managedHosts('https://app.example.com', '').has('forms.example.org')).toBe(false);
  });

  it('expiry: default days from now; a given instant only in the future and within a year', () => {
    expect(expiryOf(undefined, { now: NOW, days: 7 })?.toISOString()).toBe(
      '2026-11-24T12:00:00.000Z',
    );
    expect(expiryOf('2026-12-01T00:00:00Z', { now: NOW, days: 7 })?.toISOString()).toBe(
      '2026-12-01T00:00:00.000Z',
    );
    expect(expiryOf('2026-11-17T11:00:00Z', { now: NOW, days: 7 })).toBeNull();
    expect(expiryOf('2028-01-01T00:00:00Z', { now: NOW, days: 7 })).toBeNull();
  });

  it('the user list: keeps matching rows (and their send state), adds the new, removes the rest', () => {
    const stored = [
      row('a', { profile_id: 'p1' }),
      row('b', { phone_e164: '+201000000001' }),
      row('c', { profile_id: 'p9' }),
    ];
    expect(
      diffUsers(stored, { profileIds: ['p1', 'p2'], phones: ['+201000000001', '+201000000002'] }),
    ).toEqual({
      removeIds: ['c'],
      addProfiles: ['p2'],
      addPhones: ['+201000000002'],
    });
    expect(diffUsers(stored, { profileIds: [], phones: [] }).removeIds).toEqual(['a', 'b', 'c']);
  });
});
