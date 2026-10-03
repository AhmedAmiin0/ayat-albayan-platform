import type { PdfAssets } from './pdf-assets';
import type { ReportPdfModel } from './pdf-model';
import { AR, esc } from './pdf-text';
import { closingHtml, contentHtml, footerHtml, notesHtml, sectionHtml } from './template.body';
import { REPORT_CSS } from './template.css';
import { gradesHtml } from './template.grades';
import { attendanceHtml, headerHtml, metaHtml } from './template.header';

/**
 * The lesson report as one HTML page (R-REP-03, docs/07 §13): the academy's certificate frame and
 * section order from today's report, with the docs/07 density (2×2 content, rubrics beside the
 * overall box) so it fits one A4 page at a 12px floor. Pure: the same model gives the same HTML.
 */
export function reportHtml(model: ReportPdfModel, assets: PdfAssets): string {
  return [
    '<!doctype html><html lang="ar" dir="rtl" data-theme="light"><head><meta charset="utf-8">',
    `<title>${esc(AR.reports.formTitle)}</title>`,
    `<style>${assets.fontCss}\n${REPORT_CSS}</style></head>`,
    '<body><main class="frame"><div class="inner">',
    headerHtml(assets.logo),
    metaHtml(model),
    attendanceHtml(model),
    contentHtml(model),
    sectionHtml(AR.reports.detailTitle),
    gradesHtml(model),
    notesHtml(model),
    closingHtml(),
    footerHtml(model),
    '</div></main></body></html>',
  ].join('\n');
}
