import { ARABIC_SKILLS, ISLAMIC_RATES, JUZ_NAMES, surahName, type Grade, type Program } from '@ab/shared';
import { AR, EMPTY, esc, fill, para } from '../render/pdf-text';
import type { FamilyModel } from './family-model';

const v = AR.reports.v2;
const f = v.family;

const gradeWord = (g: Grade | null) => (g === null ? EMPTY : esc(AR.enums.grade[g]));

function row(title: string, input: { value?: string; grade: Grade | null }): string {
  const value = input.value ? `<span class="v">${input.value}</span>` : '';
  return `<div class="row"><div class="what"><span class="k">${esc(title)}</span>${value}</div><span class="pill">${gradeWord(input.grade)}</span></div>`;
}

const line = (text: string) => `<p class="muted">${text}</p>`;

function quranParts({ content }: FamilyModel): string[] {
  const rows = content.segments.map((s) =>
    row(v.segment[s.kind], { value: esc(fill(v.rangeShort, { surah: surahName(s.surah), from: s.from, to: s.to })), grade: s.grade }),
  );
  const theory = content.tajweed ? [line(esc(fill(f.theoryLine, { topic: v.tajweed[content.tajweed] })))] : [];
  return [...rows, ...theory];
}

function arabicParts({ content }: FamilyModel): string[] {
  const a = content.arabic;
  const topic = a?.topic ? [line(esc(fill(f.domainLine, { domain: v.topic, topic: a.topic })))] : [];
  return [...topic, ...ARABIC_SKILLS.map((k) => row(v.skills[k], { grade: a?.skills[k] ?? null }))];
}

function islamicParts({ content }: FamilyModel): string[] {
  const i = content.islamic;
  const lines = [
    ...(i?.domain && i.topic ? [line(esc(fill(f.domainLine, { domain: v.domains[i.domain], topic: i.topic })))] : []),
    ...(i?.memorized ? [line(esc(fill(f.memorizedLine, { text: i.memorized })))] : []),
  ];
  return [...lines, ...ISLAMIC_RATES.map((k) => row(v.islamicRates[k], { grade: i?.rates[k] ?? null }))];
}

/** The rows and lines of «ما أنجزه اليوم», per program. */
const PARTS: Record<Program, (m: FamilyModel) => string[]> = { quran: quranParts, arabic: arabicParts, islamic_studies: islamicParts };

/** «ما أنجزه اليوم» then «التقدير العام». */
export function doneHtml(m: FamilyModel): string {
  const parts = PARTS[m.program](m);
  const done = parts.length > 0 ? `<section><h2>${esc(f.doneToday)}</h2>${parts.join('')}</section>` : '';
  const overall = `<section class="overall"><span class="k">${esc(v.overall)}</span><span class="w">${gradeWord(m.overall)}</span></section>`;
  return done + overall;
}

/** «التقدّم في الحفظ»: pages held in the juz of today's new memorization (Quran, v2 history only). */
export function progressHtml(m: FamilyModel): string {
  const p = m.progress;
  if (!p) return '';
  const juzName = JUZ_NAMES[p.juz - 1] ?? '';
  const pct = Math.round((p.done / p.total) * 100);
  const vars = { juz: p.juz, done: p.done, total: p.total };
  const completed = p.completed.map((j) => fill(f.juzName, { name: JUZ_NAMES[j - 1] ?? String(j) }));
  return [
    `<section><h2>${esc(f.progress)}</h2>`,
    `<div class="bar-head"><span>${esc(fill(f.juzLabel, { juz: p.juz, name: juzName }))}</span><span>${esc(fill(f.pagesOf, vars))}</span></div>`,
    `<div class="bar" role="img" aria-label="${esc(fill(f.progressAria, vars))}"><i style="width:${pct}%"></i></div>`,
    completed.length > 0 ? line(esc(fill(f.completedJuz, { list: completed.join('، ') }))) : '',
    '</section>',
  ].join('');
}

/** «الواجب قبل الحلقة القادمة». */
export function homeworkHtml(m: FamilyModel): string {
  return m.homework ? `<section><h2>${esc(v.homework)}</h2><p class="text">${para(m.homework)}</p></section>` : '';
}

/** «ملاحظة المعلم/ة»: the quick notes, then what the teacher wrote. */
export function noteHtml(m: FamilyModel): string {
  const quick = m.content.quick.map((q) => v.quick[q]);
  const text = [quick.join('، '), m.notes?.trim() ?? ''].filter(Boolean).join('. ');
  return text ? `<section class="note"><h2>${esc(f.teacherNote)}</h2><p class="text">${para(text)}</p></section>` : '';
}
