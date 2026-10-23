import { Inject, Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../../common/storage/storage.service';
import { BUCKETS, reportPdfPath } from '../../common/storage/storage.paths';
import { pdfContact } from './pdf-contact';
import type { PdfContact } from './pdf-model';
import { pdfAssets } from './pdf-assets';
import { footerLabel } from './pdf-pages';
import { PdfRenderer } from './pdf-renderer';
import { toMessage, toModel } from './report-pdf.mapper';
import { ReportPdfSource } from './report-pdf.source';
import type { ReportReadyMessage } from './report-ready';
import { ReportPdfSettings } from './report-pdf.settings';
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

  private readonly log = new Logger(ReportPdfPublisher.name);

  /** Property injection keeps the constructor at three parameters; required (a missing provider fails at boot). */
  @Inject(ReportPdfSettings) private readonly settings!: ReportPdfSettings;

  /** Overwrites the object: a re-rendered (edited) report keeps its path (R-REP-04). */
  async publish(reportId: string, now: Date): Promise<Published> {
    const source = await this.source.load(reportId);
    if (!source) throw new Error('report not found');
    const model = { ...toModel(source, now), contact: await this.contact() };
    const body = await this.renderer.render(reportHtml(model, pdfAssets()), footerLabel({ code: model.student.code, startsAt: model.startsAt, tz: model.tz }));
    const { student_id: studentId, lesson_id: lessonId } = source.report;
    const path = reportPdfPath({ studentId, lessonId });
    await this.storage.upload({ bucket: BUCKETS.reports, path, body, contentType: 'application/pdf' });
    return { path, message: toMessage(source, path, now) };
  }

  /** The footer's contact from settings; a failed read is logged and the built-in contact is printed. */
  private async contact(): Promise<PdfContact | undefined> {
    try {
      return pdfContact(await this.settings.read());
    } catch (e) {
      this.log.warn(`report footer: settings read failed, using the built-in contact: ${e instanceof Error ? e.message : String(e)}`);
      return undefined;
    }
  }

  /** Frees Chromium between job runs. */
  close(): Promise<void> {
    return this.renderer.close();
  }
}
