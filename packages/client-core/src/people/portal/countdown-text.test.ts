import ar from '@ab/shared/i18n/ar.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import { lessonClockText } from './countdown-text.js';

const parts = { days: 0, hours: 0, minutes: 8, seconds: 12 };

describe('lessonClockText', () => {
  it('now, then the window and the start in the portal words', () => {
    expect(lessonClockText({ kind: 'now' }, ar.portal)).toBe(ar.portal.now);
    expect(lessonClockText({ kind: 'startsIn', parts }, ar.portal)).toBe('تبدأ الحلقة بعد 00:08:12');
    const two = { kind: 'opensIn' as const, parts: { ...parts, days: 2 } };
    expect(lessonClockText(two, ar.portal)).toBe('يُتاح الدخول بعد يومان 00:08:12');
  });
});
