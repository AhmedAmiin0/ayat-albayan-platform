import { describe, expect, it } from 'vitest';
import { staleAfter } from '@/test/stale-after';
import { lessonKeys } from './lesson.keys';

describe('lesson keys', () => {
  it('keeps the key shapes the schedule and booking screens already cache under', () => {
    expect(lessonKeys.overview('from=a')).toEqual(['lessons', 'overview', 'from=a']);
    expect(lessonKeys.slots('sales', 'q')).toEqual(['lessons', 'slots', 'sales', 'q']);
    expect(lessonKeys.outsideSlots('admin', 'q')).toEqual([
      'lessons',
      'outside-slots',
      'admin',
      'q',
    ]);
    expect(lessonKeys.proposals()).toEqual(['lessons', 'proposals']);
    expect(lessonKeys.trialHistory('admin', 's1')).toEqual([
      'lessons',
      'trial-dates',
      'admin',
      's1',
    ]);
  });

  it('marks every lesson read stale when a lesson write invalidates the root', async () => {
    const reads = [
      lessonKeys.overview('q'),
      lessonKeys.slots('admin', 'q'),
      lessonKeys.outsideSlots('admin', 'q'),
      lessonKeys.proposals(),
      lessonKeys.trialHistory('admin', 's1'),
    ];
    expect(await staleAfter(reads, lessonKeys.all)).toEqual(reads);
  });

  it('refreshes only the trial dates after a trial date write', async () => {
    const trials = [lessonKeys.trialHistory('admin', 's1'), lessonKeys.trialHistory('sales', 's2')];
    const others = [lessonKeys.overview('q'), lessonKeys.proposals()];
    expect(await staleAfter([...trials, ...others], lessonKeys.trialDates)).toEqual(trials);
  });
});
