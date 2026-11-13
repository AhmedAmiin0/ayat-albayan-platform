import { describe, expect, it } from 'vitest';
import type { LessonStatus } from '@ab/shared';
import { nextOpenLesson, pickHero } from './pick-hero.js';

const l = (id: string, [from, to]: [string, string], status: LessonStatus = 'scheduled') => ({
  id,
  status,
  starts_at: `2026-11-13T${from}:00Z`,
  ends_at: `2026-11-13T${to}:00Z`,
});
const at = (hhmm: string) => new Date(`2026-11-13T${hhmm}:00Z`);
const a = l('a', ['10:00', '10:45']);
const b = l('b', ['13:00', '13:45']);
const c = l('c', ['14:00', '15:00']);
const day = [a, b, c];

describe('pickHero', () => {
  it('the lesson under way wins', () => {
    expect(pickHero(day, at('13:20'))).toEqual({ kind: 'running', lesson: b });
  });

  it('else the next open one, with minutes rounded up', () => {
    expect(pickHero(day, at('12:48'))).toEqual({ kind: 'next', lesson: b, minutes: 12 });
    expect(pickHero(day, new Date('2026-11-13T12:59:30Z'))).toMatchObject({ minutes: 1 });
    expect(pickHero(day, at('13:50'))).toMatchObject({ kind: 'next', lesson: c });
  });

  it('closed or ended lessons are never the hero', () => {
    const held = l('h', ['09:00', '18:00'], 'completed');
    expect(pickHero([held], at('12:00'))).toBeNull();
    expect(pickHero(day, at('15:00'))).toBeNull();
    expect(pickHero([], at('12:00'))).toBeNull();
  });
});

describe('nextOpenLesson', () => {
  it('the first open lesson starting after now', () => {
    const moved = l('m', ['12:30', '13:00'], 'rescheduled');
    expect(nextOpenLesson([a, moved, b], at('12:00'))).toBe(b);
    expect(nextOpenLesson(day, at('13:00'))).toBe(c);
    expect(nextOpenLesson(day, at('14:00'))).toBeNull();
  });
});
