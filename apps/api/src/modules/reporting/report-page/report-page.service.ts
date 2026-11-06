import type { ReportPageView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { BUCKETS, SIGNED_URL_SECONDS } from '@/common/storage/storage.paths';
import { StorageService } from '@/common/storage/storage.service';
import { reportFileName } from '@/modules/reporting/report-pdf';
import { toPageView, type PageUrls } from './report-page.mapper';
import { ReportPageRepo } from './report-page.repo';
import type { PageFacts, PageKey, PageReportRow } from './report-page.types';
import { ReportReaders } from './report-readers';

/** A submitted report and who it is about. */
export interface PageFound {
  row: PageReportRow;
  facts: PageFacts;
}

/** One answer for unknown, draft, or not yours: nothing is learnt about another report. */
const missing = () => notFound('report_not_found');

/**
 * The report's live page (owner 2026-11-06): the SAVED report, its teacher's files and the PDF,
 * every file through a 1 h signed URL (StorageService, so the object-storage switch covers it).
 * Signed in: ReportReaders (admin, the teacher, the family, the owning assistant).
 */
@Injectable()
export class ReportPageService {
  constructor(
    private readonly repo: ReportPageRepo,
    private readonly readers: ReportReaders,
    private readonly storage: StorageService,
  ) {}

  async signedIn(key: PageKey, user: AuthUser): Promise<ReportPageView> {
    const found = await this.find(key);
    const allowed = await this.readers.canRead({
      user,
      studentId: found.row.student_id,
      sent: found.row.sent_at !== null,
      facts: found.facts,
    });
    if (!allowed) throw missing();
    return this.view(found);
  }

  /** 404 report_not_found for an unknown key or a draft. */
  async find(key: PageKey): Promise<PageFound> {
    const row = await this.repo.report(key);
    const facts = row ? await this.repo.facts(row) : null;
    if (!row || !facts) throw missing();
    return { row, facts };
  }

  async view(found: PageFound): Promise<ReportPageView> {
    return toPageView({ ...found, urls: await this.urls(found) });
  }

  private async urls({ row, facts }: PageFound): Promise<PageUrls> {
    const paths = row.attachments.map((f) => f.storage_path);
    const seconds = SIGNED_URL_SECONDS.ui;
    const files = await this.storage.signedDownloads({
      bucket: BUCKETS.attachments,
      paths,
      seconds,
    });
    const path = row.pdf_status === 'ready' ? row.pdf_path : null;
    if (!path) return { files, pdf: null };
    const name = {
      code: facts.student.code ?? '',
      startsAt: new Date(facts.lesson.starts_at),
      tz: facts.student.tz,
    };
    const pdf = await this.storage.signedDownload({
      bucket: BUCKETS.reports,
      path,
      download: reportFileName(name),
    });
    return { files, pdf: pdf.url };
  }
}
