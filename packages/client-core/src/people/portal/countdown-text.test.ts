import ar from '@ab/shared/i18n/ar.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import { lessonClockText } from './countdown-text';

const parts = { days: 0, hours: 0, minutes: 8, seconds: 12 };

describe('lessonClockText', () => {
  it('now, then the window and the start in the portal words', () => {
    expect(lessonClockText({ kind: 'now' }, ar.portal)).toBe(ar.portal.now);
    expect(lessonClockText({ kind: 'startsIn', parts }, ar.portal)).toBe('تبدأ الحلقة بعد 00:08:12');
    const two = { kind: 'opensIn' as const, parts: { ...parts, days: 2 } };
    expect(lessonClockText(two, ar.portal)).toBe('يُتاح الدخول بعد يومين 00:08:12');
  });

  it('two days after «بعد» read «يومين» (never «يومان»), one and three days as before', () => {
    const at = (days: number) => ({ kind: 'startsIn' as const, parts: { ...parts, days } });
    expect(lessonClockText(at(2), ar.portal)).toBe('تبدأ الحلقة بعد يومين 00:08:12');
    expect(lessonClockText(at(2), ar.portal)).not.toContain('يومان');
    expect(lessonClockText(at(1), ar.portal)).toBe('تبدأ الحلقة بعد يوم واحد 00:08:12');
    expect(lessonClockText(at(3), ar.portal)).toBe('تبدأ الحلقة بعد 3 أيام 00:08:12');
  });
});
