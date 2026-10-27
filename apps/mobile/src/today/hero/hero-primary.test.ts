import { allowedLessonEvents } from '@ab/shared';
import { lesson } from '../testing/fixtures';
import { heroPrimary } from './hero-primary';

const scheduled = lesson({ id: 's' });
const confirmed = lesson({ id: 'c', status: 'confirmed' });
const admin = { running: false, readOnly: false, joinOpen: false };

test('the admin: confirm first when offered, else join inside the window, else none', () => {
  expect(heroPrimary(scheduled, admin)).toBe('confirm');
  expect(heroPrimary(scheduled, { ...admin, joinOpen: true })).toBe('confirm');
  expect(heroPrimary(confirmed, { ...admin, joinOpen: true })).toBe('join');
  expect(heroPrimary(confirmed, admin)).toBeNull();
  const notOffered = lesson({ id: 'n', allowed_events: allowedLessonEvents('scheduled').filter((e) => e !== 'confirm') });
  expect(heroPrimary(notOffered, admin)).toBeNull();
});

test('read-only (sales): never confirm; join only on the running lesson inside the window', () => {
  const sales = { ...admin, readOnly: true };
  expect(heroPrimary(scheduled, sales)).toBeNull();
  expect(heroPrimary(scheduled, { ...sales, joinOpen: true })).toBeNull();
  expect(heroPrimary(scheduled, { ...sales, joinOpen: true, running: true })).toBe('join');
  expect(heroPrimary(confirmed, { ...sales, running: true })).toBeNull();
  // A sales lesson carries no allowed_events at all.
  expect(heroPrimary({ ...confirmed, allowed_events: undefined }, { ...sales, joinOpen: true, running: true })).toBe('join');
});
