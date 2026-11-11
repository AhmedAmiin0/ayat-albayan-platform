import { SETTING_DEFAULTS } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { StorageService } from '@/common/storage/storage.service';
import { BUCKETS, reportPdfPath } from '@/common/storage/storage.paths';
import { pdfContact } from './render/pdf-contact';
import { pdfAssets } from './pdf-assets';
import { footerLabel } from './render/pdf-pages';
import { PdfRenderer } from './render/pdf-renderer';
import { toModel } from './report-pdf.mapper';
import { ReportPdfSource } from './report-pdf.source';
import { readyMessages, type ReadyMessage } from './ready/report-ready-choice';
import { ReportReadyRepo } from './ready/report-ready.repo';
import { ReportPdfSettings, type ReportPdfSettingsValues } from './report-pdf.settings';
import { ReportFeedbackLink } from './report-feedback-link';
import { reportHtml } from './template/template';
import { toFamilyModel } from './v2/family-model';
import { familyHtml } from './v2/family-template';

const DEFAULT_MINUTES = SETTING_DEFAULTS.report_teacher_edit_minutes;

export interface Published {
  path: string;
  /** The family's message, then the teacher's when report_ready_teacher is approved. */
  messages: ReadyMessage[];
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

  /**
   * Property injection keeps the constructor at three parameters; required (a missing provider
   * fails at boot).
   */
  @Inject(ReportPdfSettings) private readonly settings!: ReportPdfSettings;
  @Inject(ReportFeedbackLink) private readonly feedback!: ReportFeedbackLink;
  @Inject(ReportReadyRepo) private readonly templates!: ReportReadyRepo;

  /**
   * Overwrites the object: a re-rendered (edited) report keeps its path (R-REP-04). Same path and
   * messages for v1 and v2 (readyMessages: the link templates once approved).
   */
  async publish(reportId: string, now: Date): Promise<Published> {
    const source = await this.source.load(reportId, now);
    if (!source) throw new Error('report not found');
    const settings = await this.readSettings();
    const contact = settings ? pdfContact(settings) : undefined;
    const minutes = settings?.report_teacher_edit_minutes ?? DEFAULT_MINUTES;
    const model = { ...toModel(source, now), contact };
    // A v2 report gets the v2 family page; every v1 report keeps the v1 page forever.
    const html = source.report.form_version === 2 ? familyHtml({ ...toFamilyModel(source, now), contact }, pdfAssets()) : reportHtml(model, pdfAssets());
    const body = await this.renderer.render(html, footerLabel({ code: model.student.code, startsAt: model.startsAt, tz: model.tz }));
    const { student_id: studentId, lesson_id: lessonId } = source.report;
    // The stored path («minio:…» once MinIO keeps new files, docs/45) is what the report row keeps.
    const key = reportPdfPath({ studentId, lessonId });
    const path = await this.storage.upload({ bucket: BUCKETS.reports, path: key, body, contentType: 'application/pdf' });
    const feedbackUrl = await this.feedback.url({ lessonId, studentId }, now);
    const approved = await this.templates.approved();
    const messages = readyMessages({ source, feedbackUrl, now, pdfPath: path, approved, minutes });
    return { path, messages };
  }

  /**
   * The footer's contact and the edit window from settings; a failed read is logged, the built-in
   * contact is printed and the registry's default window is used.
   */
  private async readSettings(): Promise<ReportPdfSettingsValues | null> {
    try {
      return await this.settings.read();
    } catch (e) {
      this.log.warn(`report footer: settings read failed, using the built-in contact: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  /** Frees Chromium between job runs. */
  close(): Promise<void> {
    return this.renderer.close();
  }
}
