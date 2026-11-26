import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit';
import { dayIn } from '@/features/teaching/schedule';
import { extendDoneText } from './card-text';

describe('«الدورة والباقة» on web (owner 2026-11-17)', () => {
  it('an instant names its day in the zone given', () => {
    expect(dayIn('Asia/Riyadh')('2026-11-22T21:30:00Z')).not.toBe(dayIn('UTC')('2026-11-22T21:30:00Z'));
  });

  it('«مدّ الجدول» says what it booked, the new last day and the clashes', () => {
    const text = extendDoneText({ subscriptionId: 's', inserted: 2, endsOn: '2026-11-24', conflicts: 1 });
    expect(text.startsWith(t.courseCard.extend.done.two)).toBe(true);
    expect(text.endsWith(t.courseCard.extend.clashes)).toBe(true);
    expect(extendDoneText({ subscriptionId: 's', inserted: 0, endsOn: null, conflicts: 0 })).toBe(
      t.courseCard.extend.done.zero,
    );
  });
});
