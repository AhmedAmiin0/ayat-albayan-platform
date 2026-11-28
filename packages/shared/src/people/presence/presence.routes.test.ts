import { describe, expect, it } from 'vitest';
import { presenceRoutes } from './presence.routes';

const row = { profile_id: 'p1', role: 'teacher', last_seen_at: null, name: 'Mona' };

describe('presenceRoutes (docs/33)', () => {
  it('keeps the paths the api serves today', () => {
    const { self, staff } = presenceRoutes;
    expect(`${self.method} ${self.path}`).toBe('GET /presence/me');
    expect(`${staff.method} ${staff.path}`).toBe('GET /presence/staff');
  });

  it('answers the switch and the staff list', () => {
    expect(presenceRoutes.self.response.parse({ enabled: true })).toEqual({ enabled: true });
    const staff = { enabled: true, staff: [row] };
    expect(presenceRoutes.staff.response.parse(staff)).toEqual(staff);
  });

  it.each([
    ['an unknown role', { ...row, role: 'guest' }],
    ['no name', { profile_id: 'p1', role: 'teacher', last_seen_at: null }],
  ])('refuses a staff row with %s', (_name, bad) => {
    const answer = { enabled: true, staff: [bad] };
    expect(presenceRoutes.staff.response.safeParse(answer).success).toBe(false);
  });
});
