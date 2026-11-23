import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
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

describe('MeZoneRepo: the language (profiles.locale)', () => {
  it('reads ar or en', async () => {
    const { db } = fakeDb({ profiles: [{ data: { locale: 'en' } }] });
    expect(await new MeZoneRepo(db).localeOf('p1')).toBe('en');
  });

  it('anything else, a missing row or a failed read is null (the app keeps its own)', async () => {
    expect(await new MeZoneRepo(fakeDb({ profiles: [{ data: { locale: 'fr' } }] }).db).localeOf('p1')).toBeNull();
    expect(await new MeZoneRepo(fakeDb({ profiles: [{ data: null }] }).db).localeOf('p1')).toBeNull();
    expect(await new MeZoneRepo(fakeDb({ profiles: [{ error: { message: 'down' } }] }).db).localeOf('p1')).toBeNull();
  });

  it('writes the login\'s own row; a failed write throws', async () => {
    const ok = fakeDb({ profiles: [{ data: null }] });
    await expect(new MeZoneRepo(ok.db).setLocale('p1', 'en')).resolves.toBeUndefined();
    const down = fakeDb({ profiles: [{ error: { message: 'down' } }] });
    await expect(new MeZoneRepo(down.db).setLocale('p1', 'ar')).rejects.toThrow();
  });
});
