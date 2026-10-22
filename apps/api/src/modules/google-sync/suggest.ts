import { normalizeArabic, type GoogleFound } from '@ab/shared';
import { DRIVE } from './google-format';

// Mapping suggestions (docs/24 §3 Discovery). Nothing is used until an admin confirms it.

export interface TeacherNames {
  display_name_ar: string;
  display_name_en: string | null;
  /** teachers.google_calendar_id: imported from the old «المعلمون» tab. */
  google_calendar_id: string | null;
}

/** «آيات البيان — <teacher>» → the teacher part, normalised; null for any other calendar. */
export function calendarTeacher(summary: string): string | null {
  const s = summary.trim();
  const prefix = DRIVE.calendarPrefix.trim();
  if (!s.startsWith(prefix)) return null;
  const rest = s.slice(prefix.length).replace(/^[\s—–-]+/, '');
  return rest ? normalizeArabic(rest) : null;
}

/** The imported calendar id first (when discovery saw it), then an exact name match on either name. */
export function suggestCalendar(t: TeacherNames, calendars: readonly GoogleFound[]): GoogleFound | null {
  const byId = t.google_calendar_id ? calendars.find((c) => c.id === t.google_calendar_id) : undefined;
  if (byId) return byId;
  const names = [t.display_name_ar, t.display_name_en ?? ''].map(normalizeArabic).filter(Boolean);
  return calendars.find((c) => {
    const who = calendarTeacher(c.name);
    return who !== null && names.includes(who);
  }) ?? null;
}

export interface SummaryLink {
  name: string;
  folderId: string;
  sheetId: string | null;
}

/** The summary sheet's row of this student, by normalised Arabic name; null when none or ambiguous. */
export function suggestFolder(student: string, links: readonly SummaryLink[]): SummaryLink | null {
  const name = normalizeArabic(student);
  const hits = links.filter((l) => normalizeArabic(l.name) === name);
  const folders = new Set(hits.map((h) => h.folderId));
  return folders.size === 1 ? (hits[0] ?? null) : null;
}
