import {
  ARABIC_SKILLS,
  attended,
  emptyContent,
  ISLAMIC_RATES,
  type ArabicSkill,
  type Attendance,
  type Grade,
  type IslamicDomain,
  type IslamicRate,
  type Locale,
  type Program,
  type QuickNote,
  type ReportContent,
  type ReportView,
  type SegmentKind,
  type TajweedTopic,
} from '@ab/shared';
import { rangeLabel, type RangeWords } from './v2-text.js';

// A v2 report read by the admin (web and mobile): its lines in the form's order and words, so
// both apps show the same thing. Each app injects its `t` pieces (read per call).

/** The part of the app's `t.reports.v2` read here. */
export interface ReportV2Words extends RangeWords {
  attendanceTitle: string;
  attendance: Record<Attendance, string>;
  programTitle: string;
  segment: Record<SegmentKind, string>;
  tajweedTitle: string;
  tajweed: Record<TajweedTopic, string>;
  topic: string;
  skills: Record<ArabicSkill, string>;
  domainTitle: string;
  domains: Record<IslamicDomain, string>;
  memorized: string;
  islamicRates: Record<IslamicRate, string>;
  overall: string;
  homework: string;
  nextTitle: string;
  note: string;
  quick: Record<QuickNote, string>;
  family: { doneToday: string };
  admin: { noContent: string };
}

export interface ReportV2Text {
  v2: ReportV2Words;
  grade: Record<Grade, string>;
  program: Record<Program, string>;
  lang: Locale;
}

/** One line: a label over its value; null = left blank (the app says so). */
export interface ReportLine {
  key: string;
  label: string;
  value: string | null;
}

const gradeOf = (g: Grade | null, text: ReportV2Text) => (g ? text.grade[g] : null);

function quranLines(c: ReportContent, text: ReportV2Text): ReportLine[] {
  const { v2 } = text;
  const parts = c.segments.map((s, i) => {
    const range = rangeLabel(s, { words: v2, lang: text.lang });
    const grade = gradeOf(s.grade, text);
    return { key: `segment.${i}`, label: v2.segment[s.kind], value: grade ? `${range} · ${grade}` : range };
  });
  if (parts.length === 0) parts.push({ key: 'segments', label: v2.family.doneToday, value: v2.admin.noContent });
  if (c.tajweed) parts.push({ key: 'tajweed', label: v2.tajweedTitle, value: v2.tajweed[c.tajweed] });
  return parts;
}

function arabicLines(c: ReportContent, text: ReportV2Text): ReportLine[] {
  const a = c.arabic;
  return [
    { key: 'topic', label: text.v2.topic, value: a?.topic ?? null },
    ...ARABIC_SKILLS.map((k) => ({ key: `skill.${k}`, label: text.v2.skills[k], value: gradeOf(a?.skills[k] ?? null, text) })),
  ];
}

function islamicLines(c: ReportContent, text: ReportV2Text): ReportLine[] {
  const i = c.islamic;
  const { v2 } = text;
  const lines: ReportLine[] = [
    { key: 'domain', label: v2.domainTitle, value: i?.domain ? v2.domains[i.domain] : null },
    { key: 'topic', label: v2.topic, value: i?.topic ?? null },
  ];
  if (i?.memorized) lines.push({ key: 'memorized', label: v2.memorized, value: i.memorized });
  return [
    ...lines,
    ...ISLAMIC_RATES.map((k) => ({ key: `rate.${k}`, label: v2.islamicRates[k], value: gradeOf(i?.rates[k] ?? null, text) })),
  ];
}

const CONTENT_LINES: Record<Program, (c: ReportContent, text: ReportV2Text) => ReportLine[]> = {
  quran: quranLines,
  arabic: arabicLines,
  islamic_studies: islamicLines,
};

/** «ملاحظة للأسرة»: the quick notes then the teacher's words. */
function noteLine(r: ReportView, text: ReportV2Text): ReportLine {
  const quick = (r.content?.quick ?? []).map((q) => text.v2.quick[q]);
  const parts = [...quick, ...(r.notes ? [r.notes] : [])];
  return { key: 'note', label: text.v2.note, value: parts.length > 0 ? parts.join('. ') : null };
}

/**
 * The lines of a form_version 2 report: attendance, then (attended or still open) the program,
 * its content per track, the overall grade, homework, next plan and note. Absent / excused: the
 * attendance and the note only, as the family receives it.
 */
export function reportV2Lines(r: ReportView, text: ReportV2Text): ReportLine[] {
  const { v2 } = text;
  const attendance = { key: 'attendance', label: v2.attendanceTitle, value: r.attendance ? v2.attendance[r.attendance] : null };
  if (r.attendance && !attended(r.attendance)) return [attendance, noteLine(r, text)];
  const program = r.program ?? 'quran';
  const content: ReportContent = r.content ?? emptyContent();
  return [
    attendance,
    { key: 'program', label: v2.programTitle, value: text.program[program] },
    ...CONTENT_LINES[program](content, text),
    { key: 'overall', label: v2.overall, value: gradeOf(r.grade_overall, text) },
    { key: 'homework', label: v2.homework, value: r.homework },
    { key: 'nextPlan', label: v2.nextTitle, value: r.next_plan },
    noteLine(r, text),
  ];
}
