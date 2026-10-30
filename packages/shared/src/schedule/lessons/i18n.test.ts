import { describe, expect, it } from 'vitest';
import ar from '../../../i18n/ar.json' with { type: 'json' };
import { CONFLICT_KINDS } from './conflicts.js';
import { CANCEL_BY, LESSON_EVENTS } from './state-machine.js';

// Rule 10: every machine value the scheduling UI shows has an Arabic label.
describe('scheduling labels in ar.json (R-SCH-04, R-SCH-07)', () => {
  it('every lesson event has an action label', () => {
    expect(Object.keys(ar.lessons.event).sort()).toEqual([...LESSON_EVENTS].sort());
  });

  it('every conflict kind has a message with the {when} slot', () => {
    expect(Object.keys(ar.booking.conflict).sort()).toEqual([...CONFLICT_KINDS].sort());
    for (const kind of CONFLICT_KINDS) expect(ar.booking.conflict[kind]).toContain('{when}');
  });

  it('every cancel actor has a label', () => {
    expect(Object.keys(ar.lessons.by).sort()).toEqual([...CANCEL_BY].sort());
  });

  it('the excuse action reuses the status wording «اعتذر مسبقًا»', () => {
    expect(ar.lessons.event.excuse).toBe(ar.enums.lessonStatus.excused);
    expect(ar.lessons.event.mark_no_show).toBe(ar.enums.lessonStatus.no_show);
  });
});
