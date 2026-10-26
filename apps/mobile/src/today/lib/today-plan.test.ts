import { done, lesson, muscat, pending } from '../testing/fixtures';
import { greetingPart, pickHero, todayPlan } from './today-plan';

// Thursday 1 Oct 2026; Riyadh is UTC+3. pending 16:00–16:45, muscat 17:00–18:00, done 10:00–10:45.
const at = (iso: string) => new Date(iso);
const ids = (ls: readonly { id: string }[]) => ls.map((l) => l.id);
const day = [done, pending, muscat];

test('the greeting follows the Riyadh clock: morning until 11:59, evening from 12:00', () => {
  expect(greetingPart(at('2026-10-01T08:59:00Z'))).toBe('morning'); // 11:59 Riyadh
  expect(greetingPart(at('2026-10-01T09:00:00Z'))).toBe('evening'); // 12:00 Riyadh
  expect(greetingPart(at('2026-09-30T21:30:00Z'))).toBe('morning'); // 00:30 Riyadh, 1 Oct
  expect(greetingPart(at('2026-10-01T20:00:00Z'))).toBe('evening'); // 23:00 Riyadh
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
