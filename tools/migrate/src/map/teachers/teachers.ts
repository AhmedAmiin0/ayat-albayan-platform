// teachers ← HUB «المعلمين» (11) + BOOK «المعلمون» (calendar ids). Pure map.
// Not imported: rates (FIN «Staff Expenses» are per student-month, not per lesson; owner enters
// them) and availability («الأيام المتاحة» is empty for all 11, B4; «المواعيد المتاحة» is a
// generated grid). Teachers are matched by slug, so a teacher the app already created with the
// same phone collides on teachers.phone_e164: create teachers in the app after the import.
import type { EntityModule, SourceBundle } from '../../entities/contract.ts';
import { keys, teacherSlug } from '../../keys.ts';
import { phoneCell, text, tzForPhone } from '../../sources/sheets/cells.ts';
import { accepted, issuesFor, rejected } from '../../sources/sheets/issues.ts';
import { teacherDirectory } from '../../sources/teachers.dir.ts';
import { gender } from '../../sources/values.ts';
import type { Mapped, SourceRow } from '../../types.ts';

/**
 * display_name_ar is required; the sheet holds English names only, so it comes from the teacher
 * directory (cache/teachers.json, git-ignored). Owner checks the spelling.
 */
const arabicName = (slug: string): string | undefined => teacherDirectory().names[slug];

/** «meet.google.com/abc» → «https://meet.google.com/abc»; non-links → null. */
export function meetingLink(raw: string | null): string | null {
  if (!raw || !/^(?:https?:\/\/)?[\w-]+(?:\.[\w-]+)+\/\S+$/i.test(raw)) return null;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function calendars(bundle: SourceBundle): Map<string, string> {
  const out = new Map<string, string>();
  for (const r of bundle.sheets['book_teachers'] ?? []) {
    const name = text(r.fields['name_en']);
    const cal = text(r.fields['google_calendar_id']);
    if (name && cal) out.set(teacherSlug(name), cal);
  }
  return out;
}

function mapTeacher(row: SourceRow, cals: ReadonlyMap<string, string>): Mapped {
  const issue = issuesFor('teachers', row.ref);
  const nameEn = text(row.fields['name_en']);
  const slug = nameEn ? teacherSlug(nameEn) : '';
  const nameAr = arabicName(slug);
  if (!nameEn || !nameAr)
    return rejected(row.ref, [
      issue({ code: 'unknown_teacher', severity: 'reject', field: 'name_en' }),
    ]);
  const phone = phoneCell(row.fields['phone']);
  const g = gender(text(row.fields['gender']));
  if (!g)
    return rejected(row.ref, [
      issue({ code: 'unmapped_value', severity: 'reject', field: 'gender' }),
    ]);
  const issues = phone.ok
    ? []
    : [issue({ code: 'bad_phone', severity: 'warn', field: 'phone', detail: phone.reason })];
  return accepted({
    key: keys.teacher(slug),
    ref: row.ref,
    issues,
    columns: {
      display_name_ar: nameAr,
      display_name_en: nameEn,
      gender: g,
      programs: ['quran'], // «تحفيظ وتجويد» for all 11
      phone_e164: phone.ok ? phone.e164 : null,
      meeting_link: meetingLink(text(row.fields['meeting_link'])),
      status: /نشط/.test(text(row.fields['status']) ?? '') ? 'active' : 'inactive',
      tz: phone.ok ? tzForPhone(phone.e164) : 'Africa/Cairo',
      google_calendar_id: cals.get(slug) ?? null,
    },
  });
}

export function mapTeachers(bundle: SourceBundle): Mapped[] {
  const cals = calendars(bundle);
  return (bundle.sheets['hub_teachers'] ?? []).map((r) => mapTeacher(r, cals));
}

export const teachersModule: EntityModule = {
  entity: 'teachers',
  table: 'teachers',
  map: mapTeachers,
};
