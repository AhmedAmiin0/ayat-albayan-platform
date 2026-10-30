import { done, lesson, muscat, pending } from '../testing/fixtures';
import { firstName, greetingPart, pickHero, todayPlan } from './today-plan';

// Thursday 1 Oct 2026; Riyadh is UTC+3. pending 16:00–16:45, muscat 17:00–18:00, done 10:00–10:45.
const at = (iso: string) => new Date(iso);
const ids = (ls: readonly { id: string }[]) => ls.map((l) => l.id);
const day = [done, pending, muscat];

test.each([
  ['2026-10-01T00:36:00Z', 'night'], // 03:36 Riyadh (owner 2026-10-28: not «Good morning»)
  ['2026-09-30T21:30:00Z', 'night'], // 00:30 Riyadh, 1 Oct
  ['2026-10-01T01:00:00Z', 'morning'], // 04:00
  ['2026-10-01T08:59:00Z', 'morning'], // 11:59
  ['2026-10-01T09:00:00Z', 'afternoon'], // 12:00
  ['2026-10-01T13:59:00Z', 'afternoon'], // 16:59
  ['2026-10-01T14:00:00Z', 'evening'], // 17:00
  ['2026-10-01T18:59:00Z', 'evening'], // 21:59
  ['2026-10-01T19:00:00Z', 'night'], // 22:00
] as const)('the greeting at %s follows the Riyadh clock: %s', (iso, part) => {
  expect(greetingPart(at(iso), 'Asia/Riyadh')).toBe(part);
});

test('firstName: the first word of the full name, null when missing or blank', () => {
  expect(firstName('  أحمد   أمين ')).toBe('أحمد');
  expect(firstName('Sara')).toBe('Sara');
  expect(firstName('   ')).toBeNull();
  expect(firstName(undefined)).toBeNull();
});

test('hero: the lesson under way wins over the next one', () => {
  expect(pickHero(day, at('2026-10-01T13:20:00Z'))).toEqual({ kind: 'running', lesson: pending });
});

test('hero: else the next open lesson, with whole minutes to go (rounded up)', () => {
  expect(pickHero(day, at('2026-10-01T12:48:00Z'))).toEqual({ kind: 'next', lesson: pending, minutes: 12 });
  expect(pickHero(day, at('2026-10-01T12:59:30Z'))).toMatchObject({ minutes: 1 });
  // 16:50: pending has ended, muscat is next.
  expect(pickHero(day, at('2026-10-01T13:50:00Z'))).toMatchObject({ kind: 'next', lesson: muscat });
});

test('hero: a held or no-show lesson is never the hero; none left → none', () => {
  const heldEarly = lesson({ id: 'l-held', status: 'completed' });
  const noShow = lesson({ id: 'l-ns', status: 'no_show', starts_at: muscat.starts_at, ends_at: muscat.ends_at });
  expect(pickHero([heldEarly, noShow], at('2026-10-01T12:00:00Z'))).toBeNull();
  expect(pickHero(day, at('2026-10-01T16:00:00Z'))).toBeNull();
  expect(pickHero([], at('2026-10-01T12:00:00Z'))).toBeNull();
});

test('plan: the hero leaves «بقية اليوم», ended lessons fold away', () => {
  const plan = todayPlan(day, 'all', at('2026-10-01T12:48:00Z'));
  expect(plan.hero?.lesson.id).toBe('l-pending');
  expect(ids(plan.rest)).toEqual(['l-muscat']);
  expect(ids(plan.ended)).toEqual(['l-done']);
  expect(plan.quiet).toBe(false);
});

test('plan: a column filters the rest and the fold, and its lessons are all rows (no hero)', () => {
  const waiting = todayPlan(day, 'scheduled', at('2026-10-01T12:00:00Z'));
  expect(waiting.hero).toBeNull();
  expect(ids(waiting.rest)).toEqual(['l-pending']);
  expect(ids(waiting.ended)).toEqual([]);
  const held = todayPlan(day, 'completed', at('2026-10-01T12:00:00Z'));
  expect(ids(held.rest)).toEqual([]);
  expect(ids(held.ended)).toEqual(['l-done']);
});

test('plan: a quiet day once everything has ended; an empty day is not quiet', () => {
  const late = todayPlan(day, 'all', at('2026-10-01T16:00:00Z'));
  expect(late).toMatchObject({ hero: null, rest: [], quiet: true });
  expect(ids(late.ended)).toEqual(['l-done', 'l-pending', 'l-muscat']);
  expect(todayPlan([], 'all', at('2026-10-01T16:00:00Z')).quiet).toBe(false);
});
