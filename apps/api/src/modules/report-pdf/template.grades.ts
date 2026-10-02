import { gradeStyle, REPORT_RUBRICS, type Grade } from '@ab/shared';
import type { ReportPdfModel } from './pdf-model';
import { AR, EMPTY, esc } from './pdf-text';

const PIPS = 5;

/**
 * Five rhombi, filled first (ممتاز = 5 … يحتاج إلى مراجعة = 1): drawn boxes, not glyphs, so they
 * need no font and read in greyscale (docs/07 §13). The word beside them carries the meaning.
 */
export function pipsHtml(grade: Grade | null): string {
  if (grade === null) return '';
  const on = gradeStyle[grade].pips;
  const pips = Array.from({ length: PIPS }, (_, i) => `<i class="pip${i < on ? ' on' : ''}"></i>`);
  return `<span class="pips" aria-hidden="true">${pips.join('')}</span>`;
}

function word(grade: Grade | null): string {
  return grade === null ? EMPTY : esc(AR.enums.grade[grade]);
}

/** «التقييم التفصيلي»: the six «تقييم البنود» rows beside the overall box. */
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
