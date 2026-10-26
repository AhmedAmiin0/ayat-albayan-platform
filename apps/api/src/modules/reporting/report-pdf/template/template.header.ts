import { attendanceStyle } from '@ab/shared';
import type { ReportPdfModel } from '../render/pdf-model';
import { AR, durationText, esc, fill, localDate, ltr, timeWithZone, weekdayName } from '../render/pdf-text';

const r = AR.reports;
const MINUTE = 60_000;

/** ——— ۞ ——— : the brand's ornament line. */
export function ornament(): string {
  return '<div class="orn" aria-hidden="true"><span class="dash"></span><span class="star">۞</span><span class="dash"></span></div>';
}

/** Emblem, academy name, tagline, ornament and the «تقرير الحلقة» cartouche (one per page). */
export function headerHtml(logo: string): string {
  return [
    '<header class="head">',
    `<div class="logo"><img src="${logo}" alt="${esc(AR.app.name)}"></div>`,
    `<h1 class="academy">${esc(AR.app.name)}</h1>`,
    `<p class="tagline">${esc(r.pdf.tagline)}</p>`,
    ornament(),
    `<div class="cartouche">${esc(r.formTitle)}</div>`,
    '</header>',
  ].join('');
}

function cell(label: string, value: string, sub?: string): string {
  const extra = sub ? `<div class="sub">${sub}</div>` : '';
  return `<div class="cell"><div class="k">${esc(label)}</div><div class="v">${value}</div>${extra}</div>`;
}

/** «6 من 8» inside a package, else the plain lesson number (R-LES-03). */
function lessonNoText(m: Pick<ReportPdfModel, 'lessonNo' | 'slot'>): string {
  return m.slot
    ? fill(esc(r.lessonNoValue), { n: ltr(String(m.slot.position)), total: ltr(String(m.slot.total)) })
    : ltr(String(m.lessonNo));
}

/** The 3×2 summary grid: who, with whom, what, when, and which lesson (R-REP-01: all derived). */
export function metaHtml(m: ReportPdfModel): string {
  const minutes = Math.round((m.endsAt.getTime() - m.startsAt.getTime()) / MINUTE);
  return [
    '<section class="meta">',
    cell(r.pdf.studentName, esc(m.student.name), ltr(m.student.code)),
    cell(r.pdf.teacherName, esc(m.teacherName)),
    cell(r.program, esc(AR.enums.program[m.program])),
    cell(r.date, ltr(localDate(m.startsAt, m.tz)), esc(weekdayName(m.startsAt, m.tz))),
    cell(r.pdf.time, timeWithZone(m.startsAt, m.tz), esc(durationText(minutes))),
    cell(r.lessonNo, lessonNoText(m)),
    '</section>',
  ].join('');
}

/** Shape carries the state, colour only confirms it (docs/07 principle 3). */
function chipHtml(input: { tone: string; glyph: string; label: string }): string {
  return `<span class="chip tone-${input.tone}"><i class="nuqta ${input.glyph}"></i><span>${esc(input.label)}</span></span>`;
}

/** «الحضور» with its chip. */
export function attendanceHtml(m: Pick<ReportPdfModel, 'attendance'>): string {
  const style = attendanceStyle[m.attendance];
  const chip = chipHtml({ ...style, label: AR.enums.attendance[m.attendance] });
  return `<div class="status"><span class="k">${esc(r.attendance)}</span>${chip}</div>`;
}
