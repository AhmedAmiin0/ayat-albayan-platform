import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { personZone, PROFILE_DEFAULT_TZ } from './me-zone';
import { MeZoneRepo } from './me-zone.repo';

const none = { teacher: null, guardian: null, profile: null };

describe('personZone (docs/34 §2)', () => {
  it('a teacher reads in their own tz, then a guardian', () => {
    expect(personZone({ ...none, teacher: 'Africa/Cairo', profile: 'Asia/Dubai' })).toBe('Africa/Cairo');
    expect(personZone({ ...none, guardian: 'Asia/Muscat' })).toBe('Asia/Muscat');
  });

  it('a staff profile counts only when picked (not the column default)', () => {
    expect(personZone({ ...none, profile: 'Africa/Cairo' })).toBe('Africa/Cairo');
    expect(personZone({ ...none, profile: PROFILE_DEFAULT_TZ })).toBeNull();
    expect(personZone({ ...none, profile: 'Mars/Base' })).toBeNull();
    expect(personZone(none)).toBeNull();
  });
});

describe('MeZoneRepo', () => {
  it('reads the three rows of one profile', async () => {
    const { db } = fakeDb({
      teachers: [{ data: { tz: 'Africa/Cairo' } }],
      guardians: [{ data: null }],
      profiles: [{ data: { tz: 'Asia/Riyadh' } }],
    });
    expect(await new MeZoneRepo(db).zoneOf('p1')).toBe('Africa/Cairo');
  });

  it('a failed read leaves the zone unset', async () => {
    const { db } = fakeDb({
      teachers: [{ error: { message: 'down' } }],
      guardians: [{ error: { message: 'down' } }],
      profiles: [{ data: { tz: 'Africa/Cairo' } }],
    });
    expect(await new MeZoneRepo(db).zoneOf('p1')).toBe('Africa/Cairo');
  });
});
