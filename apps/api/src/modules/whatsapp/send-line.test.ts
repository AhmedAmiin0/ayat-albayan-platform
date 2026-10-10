import { describe, expect, it } from 'vitest';
import { lineOf } from './send-line';

describe('lineOf — the line a queued row leaves from (docs/12 §13.3)', () => {
  it.each([
    ['a template stamped chat', { template_key: 'booking_confirmation', line: 'chat' as const }, 'notifications'],
    ['a template, no stamp', { template_key: 'lesson_reminder', line: null }, 'notifications'],
    ['a text stamped chat', { template_key: null, line: 'chat' as const }, 'chat'],
    ['a text stamped notifications', { template_key: null, line: 'notifications' as const }, 'notifications'],
    ['a text, no stamp (history / one line)', { template_key: null, line: null }, 'notifications'],
  ])('%s → %s', (_name, row, line) => {
    expect(lineOf(row)).toBe(line);
  });
});
