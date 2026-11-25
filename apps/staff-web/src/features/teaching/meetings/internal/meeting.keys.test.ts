import { describe, expect, it } from 'vitest';
import { staleAfter } from '@/test/stale-after';
import { meetingKeys } from './meeting.keys';

describe('meeting keys', () => {
  it('keeps the key shapes the meeting screens already cache under', () => {
    expect(meetingKeys.list()).toEqual(['internal-meetings', 'list']);
    expect(meetingKeys.public('tok')).toEqual(['internal-meetings', 'public', 'tok']);
    expect(meetingKeys.invitees('m1')).toEqual(['internal-meetings', 'invitees', 'm1']);
    expect(meetingKeys.inviteeOptions('ah')).toEqual([
      'internal-meetings',
      'invitee-options',
      'ah',
    ]);
  });

  it('refreshes the list, the invitees and the options after a meeting write', async () => {
    const reads = [meetingKeys.list(), meetingKeys.invitees('m1'), meetingKeys.inviteeOptions('')];
    expect(await staleAfter(reads, meetingKeys.all)).toEqual(reads);
  });
});
