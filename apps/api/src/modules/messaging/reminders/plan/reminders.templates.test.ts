import { describe, expect, it } from 'vitest';
import { wantedTemplates } from './reminders.templates';

describe('wantedTemplates', () => {
  it('asks for the day-before template only when its rule is on', () => {
    expect(wantedTemplates({ dayBefore: true, joinLink: false }, true)).toEqual([
      'lesson_reminder_24h',
    ]);
    expect(wantedTemplates({ dayBefore: false, joinLink: false }, true)).toEqual([]);
  });

  it('asks for the join link only with LiveKit configured and its rule on', () => {
    expect(wantedTemplates({ dayBefore: false, joinLink: true }, true)).toEqual([
      'lesson_join_link',
    ]);
    expect(wantedTemplates({ dayBefore: true, joinLink: true }, false)).toEqual([
      'lesson_reminder_24h',
    ]);
  });
});
