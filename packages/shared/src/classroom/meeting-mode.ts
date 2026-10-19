// Per-teacher meeting mode (teachers.meeting_mode, migration 490, owner 2026-10-19). null follows
// the academy default (settings.meeting_link_auto); a teacher's own mode always wins.

export const TEACHER_MEETING_MODES = ['static', 'platform'] as const;
/** 'static' = the fixed link (Meet, Zoom, …); 'platform' = our classroom. */
export type TeacherMeetingMode = (typeof TEACHER_MEETING_MODES)[number];

/** Whether a teacher's lessons are held in our classroom: the teacher's mode, else the academy switch. */
export const usesPlatform = (mode: TeacherMeetingMode | null, academyAuto: boolean): boolean =>
  mode === null ? academyAuto : mode === 'platform';

/** teachers.meeting_mode as read from the database (text + check): anything unknown follows the academy. */
export const meetingModeOf = (value: string | null | undefined): TeacherMeetingMode | null =>
  value === 'static' || value === 'platform' ? value : null;
