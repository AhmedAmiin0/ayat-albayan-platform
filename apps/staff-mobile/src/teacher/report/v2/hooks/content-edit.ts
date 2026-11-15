import {
  arabicContentSchema,
  islamicContentSchema,
  withSegment,
  type ArabicContent,
  type ArabicSkill,
  type Grade,
  type IslamicContent,
  type IslamicRate,
  type QuickNote,
  type ReportContent,
  type SegmentKind,
  type SurahRange,
  type TajweedTopic,
} from '@ab/shared';

// Pure edits of the v2 form's content (one change each), so the screens stay declarative.

/** «الدرس النظري / التجويد»: one topic; tapping the chosen one again clears it. */
export const toggleTajweed = (c: ReportContent, topic: TajweedTopic): ReportContent => ({
  ...c,
  tajweed: c.tajweed === topic ? null : topic,
});

/** The quick notes to the family: any number, each toggles. */
export const toggleQuick = (c: ReportContent, note: QuickNote): ReportContent => ({
  ...c,
  quick: c.quick.includes(note) ? c.quick.filter((q) => q !== note) : [...c.quick, note],
});

export const withArabic = (c: ReportContent, patch: Partial<ArabicContent>): ReportContent => ({
  ...c,
  arabic: { ...arabicOf(c), ...patch },
});

export const withIslamic = (c: ReportContent, patch: Partial<IslamicContent>): ReportContent => ({
  ...c,
  islamic: { ...islamicOf(c), ...patch },
});

const arabicOf = (c: ReportContent): ArabicContent => c.arabic ?? arabicContentSchema.parse({});
const islamicOf = (c: ReportContent): IslamicContent => c.islamic ?? islamicContentSchema.parse({});

/** One Arabic skill's grade. */
export function gradeSkill(
  c: ReportContent,
  change: { skill: ArabicSkill; grade: Grade },
): ReportContent {
  return withArabic(c, { skills: { ...arabicOf(c).skills, [change.skill]: change.grade } });
}

/** One Islamic studies row's grade. */
export function gradeRate(
  c: ReportContent,
  change: { rate: IslamicRate; grade: Grade },
): ReportContent {
  return withIslamic(c, { rates: { ...islamicOf(c).rates, [change.rate]: change.grade } });
}

/** The picker's «تمّ»: a part's new range (index -1 adds one), keeping the grade it had. */
export function placeRange(
  c: ReportContent,
  change: { kind: SegmentKind; index: number; range: SurahRange },
): ReportContent {
  const grade = change.index >= 0 ? (c.segments[change.index]?.grade ?? null) : null;
  return withSegment(c, {
    index: change.index,
    segment: { kind: change.kind, ...change.range, grade },
  });
}

/** A part's grade. */
export function gradePart(
  c: ReportContent,
  change: { index: number; grade: Grade },
): ReportContent {
  const segment = c.segments[change.index];
  return segment
    ? withSegment(c, { index: change.index, segment: { ...segment, grade: change.grade } })
    : c;
}
