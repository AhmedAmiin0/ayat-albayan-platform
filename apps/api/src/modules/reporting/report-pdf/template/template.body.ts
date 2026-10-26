import { packageProgress } from '@ab/shared';
import type { ReportPdfModel } from '../render/pdf-model';
import { AR, esc, ltr, para, stamp } from '../render/pdf-text';
import { ornament } from './template.header';

const r = AR.reports;

/** The built-in contact: used when the settings cannot be read, or academy_contact has no site. */
const CONTACT = { site: 'ayatalbayan.com', whatsapp: '+966 56 610 1447' } as const;

/** A «۞ title» section rule. */
export function sectionHtml(title: string): string {
  return `<h2 class="sec"><span class="star" aria-hidden="true">۞</span><span>${esc(title)}</span></h2>`;
}

function field(label: string, value: string | null, wide = false): string {
  return `<div class="field${wide ? ' wide' : ''}"><div class="k">${esc(label)}</div><div class="v">${para(value)}</div></div>`;
}

/** «محتوى الحلقة» 2×2: what was recited, memorised, revised and taught. */
export function contentHtml(m: ReportPdfModel): string {
  return [
    sectionHtml(r.done),
    '<div class="fields">',
    field(r.recited, m.recited),
    field(r.newMemorization, m.newMemorization),
    field(r.revision, m.revision),
    field(r.theory, m.theory),
    '</div>',
  ].join('');
}

/** «الملاحظات والواجب»: notes | homework, then the next plan full width. */
export function notesHtml(m: ReportPdfModel): string {
  return [
    sectionHtml(r.notesTitle),
    '<div class="fields">',
    field(r.notes, m.notes),
    field(r.homework, m.homework),
    field(r.nextPlan, m.nextPlan, true),
    '</div>',
  ].join('');
}

/** The two signature lines and the closing du'a, as on today's report. */
export function closingHtml(): string {
  const sign = (label: string) => `<div><div class="k">${esc(label)}</div><div class="line"></div></div>`;
  return [
    `<div class="signs">${sign(r.pdf.teacherSign)}${sign(r.pdf.guardianSign)}</div>`,
    '<div class="dua"><span class="star">﴿</span> ',
    `<span>${esc(r.pdf.closing)}</span>`,
    ' <span class="star">﴾</span></div>',
  ].join('');
}

/** «فاضل 2 حلقة» as of this lesson (docs/07 §6 packageProgress); empty outside a package. */
function packageLine(m: Pick<ReportPdfModel, 'slot'>): string {
  if (!m.slot) return '';
  const p = packageProgress(m.slot.position, m.slot.total, { forms: AR.subscriptions.progress });
  return `<span class="pkg">${esc(AR.subscriptions.package)}: ${esc(p.remainingLabel)}</span>`;
}

/** Contact line, then the package line at the start and the generated stamp at the end. */
export function footerHtml(m: ReportPdfModel): string {
  const contact = [
    esc(AR.app.name),
    ltr(m.contact?.site ?? CONTACT.site),
    `<span>${esc(r.pdf.whatsapp)}: ${ltr(m.contact?.whatsapp ?? CONTACT.whatsapp)}</span>`,
  ].join(' · ');
  return [
    '<footer class="foot">',
    ornament(),
    `<div>${contact}</div>`,
    '<div class="row">',
    `<span>${packageLine(m)}</span>`,
    `<span>${esc(r.pdf.generated)} · ${ltr(stamp(m.generatedAt, m.tz))}</span>`,
    '</div></footer>',
  ].join('');
}
