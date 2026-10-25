import { Module } from '@nestjs/common';
import { PdfRenderer } from './render/pdf-renderer';
import { ReportPdfJob } from './report-pdf.job';
import { ReportPdfPublisher } from './report-pdf.publisher';
import { ReportPdfQueries } from './report-pdf.queries';
import { ReportPdfSettings } from './report-pdf.settings';
import { ReportPdfSource } from './report-pdf.source';

/**
 * ReportPdfJob: HTML template → Chromium PDF → reports bucket → queued report_ready message.
 * R-REP-03. Owner: Phase 3 builder B2 (docs/11-phase3-contracts.md §1, §5).
 * Exports the job so the reports module can `kick()` it after a submit or an admin retry.
 */
@Module({
  providers: [ReportPdfQueries, ReportPdfSettings, ReportPdfSource, PdfRenderer, ReportPdfPublisher, ReportPdfJob],
  exports: [ReportPdfJob],
})
export class ReportPdfModule {}
