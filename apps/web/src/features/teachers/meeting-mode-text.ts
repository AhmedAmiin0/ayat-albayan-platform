import type { TeacherMeetingMode } from '@ab/shared';
import { t } from '@/lib/i18n';

/** A radio value per teachers.meeting_mode: null is «حسب إعداد الأكاديمية» (radios need a string). */
export type MeetingModeChoice = TeacherMeetingMode | 'academy';

export const toChoice = (mode: TeacherMeetingMode | null): MeetingModeChoice => mode ?? 'academy';
export const fromChoice = (choice: MeetingModeChoice): TeacherMeetingMode | null =>
  choice === 'academy' ? null : choice;

/** «حسب إعداد الأكاديمية (حاليًا: …)»: the academy option with what it resolves to now. */
export const academyOptionText = (platform: boolean): string =>
  `${t.teachers.meetingModeOption.academy} ${t.teachers.meetingModeResolves[platform ? 'platform' : 'static']}`;

/** The chosen option as one line (teacher facts); `platform` is the effective mode (null only). */
export function meetingModeText(mode: TeacherMeetingMode | null, platform: boolean): string {
  return mode === null ? academyOptionText(platform) : t.teachers.meetingModeOption[mode];
}
