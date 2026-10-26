import { describe, expect, it } from 'vitest';
import { threadRow } from '../inbox.fakes';
import { reopenParams } from './reopen-params';

describe('reopenParams', () => {
  it('fills the names the thread knows, by position', () => {
    const thread = threadRow({ display_name: 'أم ياسمين', teacher_name: 'أ. سارة' });
    expect(reopenParams({ params: ['contact_name', 'teacher_name'] }, thread)).toEqual({ '1': 'أم ياسمين', '2': 'أ. سارة' });
  });

  it('leaves what it cannot know empty (the send then refuses: missing_params)', () => {
    expect(reopenParams({ params: ['var_1'] }, threadRow())).toEqual({});
    expect(reopenParams({ params: ['contact_name'] }, null)).toEqual({});
  });
});
