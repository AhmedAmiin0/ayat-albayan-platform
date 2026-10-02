import { Injectable } from '@nestjs/common';
import { StorageService } from '../../common/storage/storage.service';
import { BUCKETS, reportPdfPath } from '../../common/storage/storage.paths';
import { pdfAssets } from './pdf-assets';
import { PdfRenderer } from './pdf-renderer';
import { toMessage, toModel } from './report-pdf.mapper';
import { ReportPdfSource } from './report-pdf.source';
import type { ReportReadyMessage } from './report-ready';
import { reportHtml } from './template';

export interface Published {
  path: string;
  message: ReportReadyMessage;
}

/** One report: read it, render the PDF, store it at reports/{student_id}/{lesson_id}.pdf. */
@Injectable()
export class ReportPdfPublisher {
  constructor(
    private readonly source: ReportPdfSource,
    private readonly renderer: PdfRenderer,
    private readonly storage: StorageService,
  ) {}

  /** Overwrites the object: a re-rendered (edited) report keeps its path (R-REP-04). */
  async publish(reportId: string, now: Date): Promise<Published> {
    const source = await this.source.load(reportId);
    if (!source) throw new Error('report not found');
    const body = await this.renderer.render(reportHtml(toModel(source, now), pdfAssets()));
    const { student_id: studentId, lesson_id: lessonId } = source.report;
    const path = reportPdfPath({ studentId, lessonId });
    await this.storage.upload({ bucket: BUCKETS.reports, path, body, contentType: 'application/pdf' });
    return { path, message: toMessage(source, path, now) };
  }

  /** Frees Chromium between job runs. */
  close(): Promise<void> {
    return this.renderer.close();
  }
}
