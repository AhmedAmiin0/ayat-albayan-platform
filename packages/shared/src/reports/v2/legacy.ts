import { surahName } from '../quran/quran.js';
import type { ReportContent, SegmentKind, TajweedTopic } from './content.js';

/** The v1 text columns a v2 report still fills, so the Google sheet (التسميع / الحفظ الجديد / المراجعة / الدرس النظري) reads it. */
export interface LegacyTexts {
  recited: string | null;
  newMemorization: string | null;
  revision: string | null;
  theory: string | null;
}

const rangesOf = (content: ReportContent, kind: SegmentKind): string | null => {
  const parts = content.segments.filter((s) => s.kind === kind).map((s) => `${surahName(s.surah)} ${s.from}–${s.to}`);
  return parts.length > 0 ? parts.join('، ') : null;
};

/**
 * Each track's parts as «<surah> <from>–<to>» (several joined by «، »), and the theory: the tajweed
 * topic's label (Quran) or the Arabic / Islamic lesson topic. A track with no part: null.
 */
export function legacyTexts(content: ReportContent, tajweedLabel: (topic: TajweedTopic) => string): LegacyTexts {
  return {
    recited: rangesOf(content, 'recited'),
    newMemorization: rangesOf(content, 'new'),
    revision: rangesOf(content, 'revision'),
    theory: (content.tajweed ? tajweedLabel(content.tajweed) : null) ?? content.arabic?.topic ?? content.islamic?.topic ?? null,
  };
}
