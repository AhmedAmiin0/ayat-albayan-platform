import { describe, expect, it } from 'vitest';
import { withMeeting } from './meeting-view';

describe('withMeeting (teachers.meeting_mode, migration 490)', () => {
  it('keeps the raw mode and adds what it resolves to', () => {
    expect(withMeeting({ id: 't1', meeting_mode: null }, true)).toEqual({ id: 't1', meeting_mode: null, platform_classroom: true });
    expect(withMeeting({ id: 't1', meeting_mode: 'static' }, true)).toEqual({ id: 't1', meeting_mode: 'static', platform_classroom: false });
    expect(withMeeting({ id: 't1', meeting_mode: 'platform' }, false)).toEqual({ id: 't1', meeting_mode: 'platform', platform_classroom: true });
  });

  it('an unknown or missing value reads as the academy default', () => {
    expect(withMeeting({ id: 't1', meeting_mode: 'zoom' }, false)).toEqual({ id: 't1', meeting_mode: null, platform_classroom: false });
    expect(withMeeting<{ id: string; meeting_mode?: string | null }>({ id: 't1' }, true)).toEqual({ id: 't1', meeting_mode: null, platform_classroom: true });
  });
});
