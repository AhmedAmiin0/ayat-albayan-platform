import type { TeacherMeetingMode } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

/** A radio value per teachers.meeting_mode: null is «حسب إعداد الأكاديمية» (radios need a string). */
export type MeetingModeChoice = TeacherMeetingMode | 'academy';

export const toChoice = (mode: TeacherMeetingMode | null): MeetingModeChoice => mode ?? 'academy';
export const fromChoice = (choice: MeetingModeChoice): TeacherMeetingMode | null =>
  choice === 'academy' ? null : choice;

/** «حسب إعداد الأكاديمية (حاليًا: …)»: the academy option with what it resolves to now (bare when unknown). */
export const academyOptionText = (platform: boolean | null): string =>
  platform === null
    ? t.teachers.meetingModeOption.academy
    : `${t.teachers.meetingModeOption.academy} ${t.teachers.meetingModeResolves[platform ? 'platform' : 'static']}`;

/** The chosen option as one line (teacher facts); `platform` is the effective mode (null only). */
export function meetingModeText(mode: TeacherMeetingMode | null, platform: boolean): string {
  return mode === null ? academyOptionText(platform) : t.teachers.meetingModeOption[mode];
}

/**
 * settings.meeting_link_auto as far as the form can tell: GET /settings/public's answer (`loaded`), else
 * — loading or failed — an academy-mode teacher's platform_classroom, which the API resolved from that
 * same setting. null = unknown: the academy option has no «حاليًا» and no note is shown.
 */
export function knownAcademyAuto(
  loaded: boolean | undefined,
  teacher: { meeting_mode: TeacherMeetingMode | null; platform_classroom: boolean } | null,
): boolean | null {
  if (loaded !== undefined) return loaded;
  return teacher?.meeting_mode === null ? teacher.platform_classroom : null;
}

/** usesPlatform with an unknown academy default: a set mode needs no setting; null follows `academy`. */
export const effectivePlatform = (mode: TeacherMeetingMode | null, academy: boolean | null): boolean | null =>
  mode === null ? academy : mode === 'platform';
