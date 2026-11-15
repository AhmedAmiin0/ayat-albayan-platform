import type { MeetingView } from '@ab/shared';

/** A MeetingView for the tests: an open instant meeting I manage, unless overridden. */
export const meetingRow = (over: Partial<MeetingView> = {}): MeetingView => ({
  id: 'm-1',
  title: 'اجتماع الإدارة',
  created_by: 'u-1',
  created_at: '2026-10-05T09:00:00.000Z',
  ends_at: null,
  starts_at: null,
  planned_end_at: null,
  cancelled_at: null,
  state: 'open',
  window: null,
  can_join: true,
  invitees_count: 0,
  my_invite: null,
  can_manage: true,
  ...over,
});
