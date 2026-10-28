import { attendanceStyle, packageProgress } from '@ab/shared';
import type { PdfAssets } from '../pdf-assets';
import { AR, esc, fill, localDate, ltr, stamp, timeWithZone, weekdayName } from '../render/pdf-text';
import { FAMILY_CSS } from './family-css';
import type { FamilyModel } from './family-model';
import { doneHtml, homeworkHtml, noteHtml, progressHtml } from './family-sections';

const v = AR.reports.v2;
const f = v.family;
const CONTACT_WHATSAPP = '+966 56 610 1447';

/** «الأحد 2026-10-27» in the guardian's zone. */
const day = (at: Date, tz: string) => `${esc(weekdayName(at, tz))} ${ltr(localDate(at, tz))}`;

/** «الحلقة 9 من 12» inside a package, else «الحلقة 14». */
function lessonText(m: FamilyModel): string {
  return m.slot
    ? fill(esc(v.lessonOf), { n: ltr(String(m.slot.position)), total: ltr(String(m.slot.total)) })
    : fill(esc(v.lessonNo), { n: ltr(String(m.lessonNo)) });
}

function headerHtml(m: FamilyModel, logo: string): string {
  const tone = attendanceStyle[m.attendance].tone;
  const meta = [day(m.startsAt, m.tz), lessonText(m), esc(fill(v.teacherChip, { name: m.teacherName }))].join(' · ');
  return [
    '<header class="head">',
    `<p class="brand"><img src="${logo}" alt=""><span>${esc(AR.app.name)}</span></p>`,
    `<h1>${esc(fill(f.title, { name: m.student.name }))}</h1>`,
    `<p class="muted">${meta}</p>`,
    `<span class="chip tone-${tone}">${esc(v.attendance[m.attendance])}</span>`,
    '</header>',
  ].join('');
}

/** «الحلقة القادمة»: when (if booked) and the plan (if any). */
function nextHtml(m: FamilyModel): string {
  const when = m.nextLessonAt ? `${day(m.nextLessonAt, m.tz)} ${timeWithZone(m.nextLessonAt, m.tz)}` : '';
  const text = [when, m.nextPlan ? esc(m.nextPlan) : ''].filter(Boolean).join(' · ');
  return text ? `<section><h2>${esc(v.nextTitle)}</h2><p class="muted">${text}</p></section>` : '';
}

function footerHtml(m: FamilyModel): string {
  const left = m.slot ? packageProgress(m.slot.position, m.slot.total, { forms: AR.subscriptions.progress }).remainingLabel : null;
  const ask = `${esc(f.ask)}: ${ltr(m.contact?.whatsapp ?? CONTACT_WHATSAPP)}`;
  return [
    '<footer class="foot">',
    `<span>${[left ? esc(fill(f.lessonsLeft, { left })) : '', ask].filter(Boolean).join(' · ')}</span>`,
    `<span>${esc(AR.reports.pdf.generated)} · ${ltr(stamp(m.generatedAt, m.tz))}</span>`,
    '</footer>',
  ].join('');
}

/**
 * The v2 lesson report the family receives (owner 2026-10-26 «a better report for the family»,
 * docs/design/report-form/ParentReport.dc.html). Same PDF path and WhatsApp message as v1; only
 * the page changes. Absent / excused: the attendance line, the note and the next lesson only.
 * Pure: the same model gives the same HTML.
 */
export function familyHtml(m: FamilyModel, assets: PdfAssets): string {
  const attended = m.attendance === 'on_time' || m.attendance === 'late';
  const sections = attended
    ? [doneHtml(m), progressHtml(m), homeworkHtml(m), noteHtml(m), nextHtml(m)]
    : [`<p class="text">${esc(fill(f.absentLine, { attendance: v.attendance[m.attendance] }))}</p>`, noteHtml(m), nextHtml(m)];
  return [
    '<!doctype html><html lang="ar" dir="rtl" data-theme="light"><head><meta charset="utf-8">',
    `<title>${esc(v.formTitle)}</title>`,
    `<style>${assets.fontCss}\n${FAMILY_CSS}</style></head>`,
    '<body><main class="sheet">',
    headerHtml(m, assets.logo),
    ...sections.filter(Boolean),
    footerHtml(m),
    '</main></body></html>',
  ].join('\n');
}
