// Invented students, reports and zip files for the PDF matching tests.
import type { SourceBundle } from '../entities/contract.ts';
import { keys } from '../keys.ts';
import { type Desired, resolve } from '../plan/resolve.ts';
import type { EntityName } from '../types.ts';
import { ZIP_FILES, zipFileRows } from './files.ts';

export const R = 'تقارير آيات البيان/';
const G = '+201000000001';

export function report(o: { name: string; day: string; sentAt?: string }): Desired[] {
  const s = keys.student({ guardianPhone: G, name: o.name });
  const lesson = keys.lesson({ teacher: 'abrar', students: [s.key], at: o.day });
  const key = keys.lessonReport({ lesson: lesson.key, student: s.key });
  const columns = { submitted_at: o.sentAt ?? `${o.day}T15:00:00.000Z` };
  const value = { columns, refs: { lesson_id: lesson, student_id: s } };
  return resolve([{ ok: true, key, value, ref: { source: 'HUB', tab: 'r', row: 2 }, issues: [] }])
    .kept;
}

export function bundle(o: { files: string[]; reports: Desired[]; approved?: string[] }) {
  const b: SourceBundle = {
    sheets: { [ZIP_FILES]: zipFileRows(o.files.map((name) => ({ name, size: 1 }))) },
    crm: {},
    earlier: new Map<EntityName, Desired[]>([['lesson_reports', o.reports]]),
    today: '2026-10-02',
    approvedPdfs: new Set(o.approved ?? []),
  };
  return b;
}
