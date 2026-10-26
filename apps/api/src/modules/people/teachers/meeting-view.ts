import { meetingModeOf, usesPlatform, type TeacherMeetingMode } from '@ab/shared';

// teachers.meeting_mode (migration 490) as every teacher read returns it: the stored mode (null =
// the academy default) and what it resolves to now, so clients never combine two sources.

export type MeetingFields = { meeting_mode: TeacherMeetingMode | null; platform_classroom: boolean };

/** `row` with its raw meeting_mode and platform_classroom = usesPlatform(mode, settings.meeting_link_auto). */
export function withMeeting<T extends { meeting_mode?: string | null }>(row: T, academyAuto: boolean): Omit<T, 'meeting_mode'> & MeetingFields {
  const mode = meetingModeOf(row.meeting_mode);
  return { ...row, meeting_mode: mode, platform_classroom: usesPlatform(mode, academyAuto) };
}
