import { Module } from '@nestjs/common';
import { ShortLinksModule } from '@/modules/platform/short-links';
import { ReportFeedbackLink } from './report-feedback-link';
import { PdfRenderer } from './render/pdf-renderer';
import { ReportPdfJob } from './report-pdf.job';
import { ReportPdfPublisher } from './report-pdf.publisher';
import { ReportPdfQueries } from './report-pdf.queries';
import { ReportPdfSettings } from './report-pdf.settings';
import { ReportPdfSource } from './report-pdf.source';
import { ReportReadyRepo } from './ready/report-ready.repo';

/**
 * ReportPdfJob: HTML template → Chromium PDF → reports bucket → queued report_ready message.
 * R-REP-03. Owner: Phase 3 builder B2 (docs/11-phase3-contracts.md §1, §5).
 * Exports the job so the reports module can `kick()` it after a submit or an admin retry.
 */
@Module({
  imports: [ShortLinksModule],
  providers: [
    ReportPdfQueries,
    ReportPdfSettings,
    ReportPdfSource,
    PdfRenderer,
    ReportFeedbackLink,
    ReportReadyRepo,
    ReportPdfPublisher,
    ReportPdfJob,
  ],
  exports: [ReportPdfJob],
})
export class ReportPdfModule {}
