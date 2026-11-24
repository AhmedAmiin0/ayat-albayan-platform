import { REPORT_RUBRICS } from '@ab/shared';
import type { Grade } from '@ab/catalog';
import { gradeStyle } from '@ab/money';
import type { ReportPdfModel } from '@/modules/reporting/report-pdf/render/pdf-model';
import { AR, EMPTY, esc } from '@/modules/reporting/report-pdf/render/pdf-text';

const PIPS = 5;

/** Drawn boxes, not glyphs, so they need no font and read in greyscale (docs/07 §13). */
function pipsHtml(grade: Grade | null): string {
  if (grade === null) return '';
  const on = gradeStyle[grade].pips;
  const pips = Array.from({ length: PIPS }, (_, i) => `<i class="pip${i < on ? ' on' : ''}"></i>`);
  return `<span class="pips" aria-hidden="true">${pips.join('')}</span>`;
}

function word(grade: Grade | null): string {
  return grade === null ? EMPTY : esc(AR.enums.grade[grade]);
}

export function gradesHtml(m: Pick<ReportPdfModel, 'grades' | 'overall'>): string {
  const rows = REPORT_RUBRICS.map((rubric) => {
    const grade = m.grades[rubric];
    return [
      '<div class="rubric">',
      `<span class="k">${esc(AR.reports.rubric[rubric])}</span>`,
      pipsHtml(grade),
      `<span class="w">${word(grade)}</span>`,
      '</div>',
    ].join('');
  });
  return [
    '<div class="grades">',
    `<div class="rubrics" aria-label="${esc(AR.reports.rubricTitle)}">${rows.join('')}</div>`,
    '<div class="overall">',
    `<span class="k">${esc(AR.reports.overall)}</span>`,
    `<span class="w">${word(m.overall)}</span>`,
    pipsHtml(m.overall),
    '</div></div>',
  ].join('');
}
