import {
  clockTime,
  DURATIONS,
  RIYADH_TZ,
  type Attendance,
  type LeadSource,
  type LessonStatus,
  type Program,
  type StudentStatus,
} from '@ab/shared';
import { ar } from '@/common/infra/i18n/server-text';
import { riyadhDate } from '@/modules/reporting/dashboard/range';
import { riyadhStamp, safeText, type Cell } from './csv';

// Students and lessons CSV rows (R-RPT-03). Headers and enum words come from ar.json; instants are
// Riyadh local; phones E.164 as-is; typed text goes through safeText.

const { students: S, guardians: G, exports: X, subscriptions: SUB, common } = ar;

export interface StudentIn {
  code: string | null;
  name: string;
  status: StudentStatus;
  program: Program;
  age: number | null;
  tz: string;
  created_at: string;
  guardian: { name: string; phone_e164: string; country: string | null; source: LeadSource | null } | null;
  teacher: { display_name_ar: string } | null;
}

const studentHeader = (): Cell[] => [
  S.code, S.name, S.status, S.program, S.age, S.teacher, S.guardian, S.guardianPhone, G.country, G.source, S.tz, S.createdAt,
];

export function studentRows(rows: readonly StudentIn[]): Cell[][] {
  return [
    studentHeader(),
    ...rows.map((s) => [
      s.code ?? '',
      safeText(s.name),
      ar.enums.studentStatus[s.status],
      ar.enums.program[s.program],
      s.age,
      safeText(s.teacher?.display_name_ar),
      safeText(s.guardian?.name),
      s.guardian?.phone_e164 ?? '',
      s.guardian?.country ?? '',
      s.guardian?.source ? ar.enums.leadSource[s.guardian.source] : '',
      s.tz,
      riyadhStamp(s.created_at),
    ]),
  ];
}

export interface LessonIn {
  starts_at: string;
  ends_at: string;
  status: LessonStatus;
  teacher: { display_name_ar: string } | null;
  lesson_students: { attendance: Attendance | null; chargeable: boolean; student: { code: string | null; name: string } | null }[];
}

const lessonHeader = (): Cell[] => [
  X.columns.date, X.columns.time, SUB.duration, S.teacher, S.code, S.name, X.columns.lessonStatus, X.columns.attendance, X.columns.chargeable,
];

/** «30 دقيقة» for a catalog length, else the minutes. */
function durationLabel(l: Pick<LessonIn, 'starts_at' | 'ends_at'>): Cell {
  const minutes = Math.round((Date.parse(l.ends_at) - Date.parse(l.starts_at)) / 60_000);
  const d = DURATIONS.find((x) => x === minutes);
  return d === undefined ? minutes : ar.enums.duration[d];
}

/** One row per (lesson, student), the owner's sheet grain; a lesson without students keeps one row. */
export function lessonRows(rows: readonly LessonIn[]): Cell[][] {
  return [
    lessonHeader(),
    ...rows.flatMap((l) => {
      const at = new Date(l.starts_at);
      const head: Cell[] = [riyadhDate(l.starts_at), clockTime(at, RIYADH_TZ), durationLabel(l), safeText(l.teacher?.display_name_ar)];
      const status = ar.enums.lessonStatus[l.status];
      if (l.lesson_students.length === 0) return [[...head, '', '', status, '', '']];
      return l.lesson_students.map((ls) => [
        ...head,
        ls.student?.code ?? '',
        safeText(ls.student?.name),
        status,
        ls.attendance ? ar.enums.attendance[ls.attendance] : '',
        ls.chargeable ? common.yes : common.no,
      ]);
    }),
  ];
}
