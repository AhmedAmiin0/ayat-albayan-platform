import { courseActionsKey, coursePauseKey } from '@ab/client-core';
import { describe, expect, it } from 'vitest';
import { staleAfter } from '@/test/stale-after';
import { pauseKeys } from './pause.keys';

describe('pause keys', () => {
  it('keeps the key shapes the pause screens already cache under', () => {
    const window = { studentId: 's1', from: '2026-12-01', until: null };
    expect(pauseKeys.preview(window)).toEqual([
      'course-pause',
      's1',
      'preview',
      '2026-12-01',
      null,
    ]);
    expect(pauseKeys.resume('s1')).toEqual(['course-actions', 's1', 'card', 'resume']);
  });

  it('refreshes the preview after a pause write, and not the resume preview', async () => {
    const preview = pauseKeys.preview({ studentId: 's1', from: 'a', until: 'b' });
    const resume = pauseKeys.resume('s1');
    expect(await staleAfter([preview, resume], coursePauseKey('s1'))).toEqual([preview]);
  });

  it('refreshes the resume preview after a course action on the same student', async () => {
    const resume = pauseKeys.resume('s1');
    expect(await staleAfter([resume, pauseKeys.resume('s2')], courseActionsKey('s1'))).toEqual([
      resume,
    ]);
  });
});
