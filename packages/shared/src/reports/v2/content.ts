import { z } from 'zod';
import { GRADES } from '../../enums/index.js';
import { isAyah, SURAH_COUNT } from '../quran/quran.js';

// The v2 lesson report's structured content (owner 2026-10-26, docs/design/report-form): stored
// whole in lesson_reports.content (jsonb, form_version 2, migration 20261028000940).

/** The three Quran tracks of a lesson, in the form's order (التسميع · الحفظ الجديد · المراجعة). */
export const SEGMENT_KINDS = ['recited', 'new', 'revision'] as const;
export type SegmentKind = (typeof SEGMENT_KINDS)[number];

/** «الدرس النظري / التجويد» chips (optional, one). */
export const TAJWEED_TOPICS = ['noon_sakin', 'meem_sakin', 'madd', 'qalqala', 'makharij'] as const;
export type TajweedTopic = (typeof TAJWEED_TOPICS)[number];

/** Arabic program: the four graded skills. */
export const ARABIC_SKILLS = ['reading', 'writing', 'listening', 'grammar'] as const;
export type ArabicSkill = (typeof ARABIC_SKILLS)[number];

/** Islamic studies: «المجال» chips and the two graded rows. */
export const ISLAMIC_DOMAINS = ['aqeedah', 'fiqh', 'seerah', 'hadith', 'adab'] as const;
export type IslamicDomain = (typeof ISLAMIC_DOMAINS)[number];
export const ISLAMIC_RATES = ['comprehension', 'participation'] as const;
export type IslamicRate = (typeof ISLAMIC_RATES)[number];

/** Quick notes to the family (the chips above «ملاحظة للأسرة»). */
export const QUICK_NOTES = ['keep_going', 'daily_revision', 'tajweed_focus'] as const;
export type QuickNote = (typeof QUICK_NOTES)[number];

/** A form holds at most this many surah parts. */
export const MAX_SEGMENTS = 9;

const grade = z.enum(GRADES).nullable().default(null);
const shortText = z
  .string()
  .trim()
  .max(300)
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .default(null);
const ayah = z.int().min(1).max(286);

/** One surah part: the surah, the ayah range (from ≤ to, both in the surah) and its grade. */
export const segmentSchema = z
  .object({ kind: z.enum(SEGMENT_KINDS), surah: z.int().min(1).max(SURAH_COUNT), from: ayah, to: ayah, grade })
  .refine((s) => s.from <= s.to && isAyah({ surah: s.surah, ayah: s.to }), { message: 'invalid_range', path: ['to'] });

const gradesOf = <K extends string>(keys: readonly K[]) =>
  z.object(Object.fromEntries(keys.map((k) => [k, grade])) as Record<K, typeof grade>);

export const arabicContentSchema = z.object({ topic: shortText, skills: gradesOf(ARABIC_SKILLS).prefault({}) });

export const islamicContentSchema = z.object({
  domain: z.enum(ISLAMIC_DOMAINS).nullable().default(null),
  topic: shortText,
  memorized: shortText,
  rates: gradesOf(ISLAMIC_RATES).prefault({}),
});

/** lesson_reports.content for form_version 2. Every part has a default, so `{}` is an empty form. */
export const reportContentSchema = z.object({
  segments: z.array(segmentSchema).max(MAX_SEGMENTS).default([]),
  tajweed: z.enum(TAJWEED_TOPICS).nullable().default(null),
  arabic: arabicContentSchema.nullable().default(null),
  islamic: islamicContentSchema.nullable().default(null),
  quick: z.array(z.enum(QUICK_NOTES)).max(QUICK_NOTES.length).default([]),
});

export type ReportSegment = z.output<typeof segmentSchema>;
export type ArabicContent = z.output<typeof arabicContentSchema>;
export type IslamicContent = z.output<typeof islamicContentSchema>;
export type ReportContent = z.output<typeof reportContentSchema>;
/** What a client sends: every part optional. */
export type ReportContentInput = z.input<typeof reportContentSchema>;

/** An empty v2 form. */
export const emptyContent = (): ReportContent => reportContentSchema.parse({});
