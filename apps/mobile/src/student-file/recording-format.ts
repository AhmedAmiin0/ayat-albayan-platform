import { teacherName } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';

const R = t.mobileStudentFile.recordings;
const MB = 1024 * 1024;
const GB = 1024 * MB;

/** `1:02:05` / `12:30`: Western digits, no unit words. Unknown (still running, old rows) shows «—». */
export function durationText(seconds: number | null): string {
  if (seconds === null) return R.unknown;
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** `48 ميغابايت` / `1.2 غيغابايت` (one decimal over a gigabyte, whole megabytes below). */
export function sizeText(bytes: number | null): string {
  if (bytes === null) return R.unknown;
  if (bytes >= GB) return R.sizeGb.replace('{n}', (bytes / GB).toFixed(1));
  return R.sizeMb.replace('{n}', String(Math.max(1, Math.round(bytes / MB))));
}

/** A teacher's name in the UI language (the English name when the English UI has one). */
export const teacherLabel = (teacher: { display_name_ar: string; display_name_en?: string | null }): string =>
  teacherName(teacher, locale);
