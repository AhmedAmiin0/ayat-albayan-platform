import { Injectable, Logger } from '@nestjs/common';
import { firstOrigin } from '@/common/http/public-origin';
import { loadEnv } from '@/config/env/env';
import { ShortLinks } from '@/modules/platform/short-links';
import { FamilyFeedbackLinks } from '@/common/http/family-feedback';

interface Pair {
  lessonId: string;
  studentId: string;
}

/** docs/19: never blocks the report; falls back to the long page, then the web address (logged). */
@Injectable()
export class ReportFeedbackLink {
  private readonly log = new Logger(ReportFeedbackLink.name);

  constructor(
    private readonly feedback: FamilyFeedbackLinks,
    private readonly links: ShortLinks,
  ) {}

  /** Never throws: any failure is logged and the academy's web address goes. */
  async url(pair: Pair, now: Date): Promise<string> {
    const origin = firstOrigin(loadEnv().WEB_ORIGIN);
    return this.build({ pair, origin }, now).catch((e: unknown) => {
      this.log.warn(`report_ready: feedback link failed (${String(e)}), the web address goes`);
      return origin;
    });
  }

  private async build(input: { pair: Pair; origin: string }, now: Date): Promise<string> {
    const { pair, origin } = input;
    const link = await this.feedback.forLesson(pair, now);
    if (!link) {
      this.log.warn(
        `report_ready: no feedback link for lesson ${pair.lessonId}, the web address goes instead`,
      );
      return origin;
    }
    const url = `${origin}/feedback/${link.token}`;
    const subject = `${pair.lessonId}:${pair.studentId}`;
    return this.links
      .forTarget({ kind: 'feedback', subject, url, expiresAt: link.expiresAt })
      .catch((e: unknown) => {
        this.log.warn(
          `report_ready: feedback short link failed (${String(e)}), the long link goes`,
        );
        return url;
      });
  }
}
