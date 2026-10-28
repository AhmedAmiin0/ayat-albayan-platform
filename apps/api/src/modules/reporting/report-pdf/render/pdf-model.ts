import type { Attendance, Grade, Program, Rubric } from '@ab/shared';

/** Everything the report PDF shows (R-REP-03, docs/07 §13): read from the DB, never typed. */
export interface ReportPdfModel {
  student: { name: string; code: string };
  teacherName: string;
  program: Program;
  startsAt: Date;
  endsAt: Date;
  /** The guardian's zone: the PDF is theirs, like the report_ready message. */
  tz: string;
  /** «رقم الحلقة» outside a package (R-LES-03): v_lesson_sequence.seq, else completed before + 1. */
  lessonNo: number;
  /** This lesson's place in the package it consumed, null when it consumed none (trial, excused). */
  slot: PackageSlot | null;
  attendance: Attendance;
  recited: string | null;
  newMemorization: string | null;
  revision: string | null;
  theory: string | null;
  grades: Record<Rubric, Grade | null>;
  overall: Grade | null;
  notes: string | null;
  homework: string | null;
  nextPlan: string | null;
  /** Render time, for the «تقرير صادر آليًا» stamp. */
  generatedAt: Date;
  /** The footer's contact line (settings.academy_contact); absent = the built-in CONTACT. */
  contact?: PdfContact;
}

/** Already display-ready: the site as typed, the WhatsApp number grouped («+966 56 610 1447»). */
export interface PdfContact {
  site?: string;
  whatsapp?: string;
}

export interface PackageSlot {
  /** 1-based; above `total` when the student attended past the package (FIFO overflow). */
  position: number;
  total: number;
}

export interface SlotPackage {
  id: string;
  lessonsTotal: number;
  /** Taken before the platform (migration 932): the package holds lessonsTotal − this platform lessons. */
  lessonsUsedBefore?: number;
  /** Local date YYYY-MM-DD. */
  startsOn: string;
  /** ISO instant. */
  createdAt: string;
}

const byStart = (a: SlotPackage, b: SlotPackage) =>
  a.startsOn.localeCompare(b.startsOn) ||
  Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
  a.id.localeCompare(b.id);

/**
 * Which package unit lesson `n` used (n = v_package_lessons.n, the student's nth consuming
 * lesson): packages fill FIFO in (starts_on, created_at, id) order and overflow lands on the
 * newest, exactly as migration 123 allocates them (932: after its lessons used before the platform).
 * Stable: later lessons never change it.
 */
export function packageSlot(n: number | null, packages: readonly SlotPackage[]): PackageSlot | null {
  if (n === null || n < 1) return null;
  const sorted = [...packages].sort(byStart);
  let capFrom = 0;
  for (const [i, p] of sorted.entries()) {
    const before = p.lessonsUsedBefore ?? 0;
    if (n <= capFrom + p.lessonsTotal - before || i === sorted.length - 1) {
      return { position: n - capFrom + before, total: p.lessonsTotal };
    }
    capFrom += p.lessonsTotal - before;
  }
  return null;
}
