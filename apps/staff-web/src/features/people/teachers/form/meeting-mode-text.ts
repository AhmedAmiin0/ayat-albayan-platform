import type { TeacherMeetingMode } from '@ab/schedule';
import { t } from '@ab/web-kit';

/** Null maps to the academy default because radios need a string. */
export type MeetingModeChoice = TeacherMeetingMode | 'academy';

export const toChoice = (mode: TeacherMeetingMode | null): MeetingModeChoice => mode ?? 'academy';
export const fromChoice = (choice: MeetingModeChoice): TeacherMeetingMode | null =>
  choice === 'academy' ? null : choice;

/** Bare when the academy setting is unknown. */
export const academyOptionText = (platform: boolean | null): string =>
  platform === null
    ? t.teachers.meetingModeOption.academy
    : `${t.teachers.meetingModeOption.academy} ${t.teachers.meetingModeResolves[platform ? 'platform' : 'static']}`;

/** The chosen option as one line (teacher facts); `platform` is the effective mode (null only). */
export function meetingModeText(mode: TeacherMeetingMode | null, platform: boolean): string {
  return mode === null ? academyOptionText(platform) : t.teachers.meetingModeOption[mode];
}

/** Null means unknown: the academy option shows no current value and no note. */
export function knownAcademyAuto(
  loaded: boolean | undefined,
  teacher: { meeting_mode: TeacherMeetingMode | null; platform_classroom: boolean } | null,
): boolean | null {
  if (loaded !== undefined) return loaded;
  return teacher?.meeting_mode === null ? teacher.platform_classroom : null;
}

/** usesPlatform with an unknown academy default: a set mode needs no setting; null follows. */
export const effectivePlatform = (
  mode: TeacherMeetingMode | null,
  academy: boolean | null,
): boolean | null => (mode === null ? academy : mode === 'platform');
