import { Module } from '@nestjs/common';

/**
 * ReportPdfJob: HTML template → Chromium PDF → reports bucket → queued report_ready message.
 * R-REP-03.
 * Owner: Phase 3 builder B2 (docs/11-phase3-contracts.md §1).
 */
@Module({})
export class ReportPdfModule {}
