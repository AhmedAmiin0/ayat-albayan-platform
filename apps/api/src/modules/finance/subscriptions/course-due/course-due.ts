import { courseNoticeData } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { ar } from '@/common/infra/i18n/server-text';
import { PushService } from '@/common/push/push.service';
import { CourseDueRepo, type UnbookedPackage } from './course-due.repo';

/** How a paid link's assistant is told instead (PaymentReceived): her own title and tap target. */
interface CourseBook {
  profileId: string;
  title: string;
  data: Record<string, string>;
}

/** Who saved the draft that could not be booked, its version, and why (default: a clash). */
interface DraftMiss {
  savedBy: string;
  savedAt: string;
  reason?: 'clash' | 'failed';
}

/** The alert's line per reason (read at send time: admins' text overrides apply). */
const MISS_TEXT: Record<NonNullable<DraftMiss['reason']>, () => string> = {
  clash: () => ar.courseDraft.clashText,
  failed: () => ar.courseDraft.failText,
};

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * «احجز أيام الحلقات» (owner 2026-11-06: a link sale left the package with no weekly course). A
 * paid link's assistant gets «تم الدفع: احجز أيام الحلقات», opening the course wizard; the
 * alerts sweep tells the admins and the package's assistant (bell + push, payment_due with its own
 * title) once per package (subject `course_unbooked:<id>`, PushService's dedup key) when an active
 * package has had no course for 2 hours. Never throws.
 */
@Injectable()
export class CourseDue {
  private readonly log = new Logger(CourseDue.name);

  constructor(
    private readonly repo: CourseDueRepo,
    private readonly push: PushService,
  ) {}

  /** The paid link's assistant notice while its package has no course; undefined otherwise. */
  async paidNotice(subscriptionId: string, assistantId: string): Promise<CourseBook | undefined> {
    try {
      const p = await this.repo.unbooked(subscriptionId);
      const title = ar.courseDue.paidTitle;
      return p ? { profileId: assistantId, title, data: noticeData(p) } : undefined;
    } catch (e) {
      this.log.warn(`course due ${subscriptionId}: ${errText(e)}`);
      return undefined;
    }
  }

  /** The alerts sweep's safety net: how many packages were told about. */
  async sweep(now: Date): Promise<number> {
    try {
      const due = await this.repo.overdue(now);
      for (const p of due) await this.tell(p);
      return due.length;
    } catch (e) {
      this.log.error(`course due sweep: ${errText(e)}`);
      return 0;
    }
  }

  /**
   * A draft's days clashed at payment (owner 2026-11-06): nothing was booked, the draft stays as
   * the wizard's prefill; its assistant and the admins pick again (once per saved version).
   */
  async clash(subscriptionId: string, draft: DraftMiss): Promise<void> {
    try {
      const p = await this.repo.package(subscriptionId);
      if (!p) return;
      const event = {
        subject: `course_draft_clash:${subscriptionId}:${draft.savedAt}`,
        title: ar.courseDraft.clashTitle,
        vars: { student: p.student, left: MISS_TEXT[draft.reason ?? 'clash']() },
        data: noticeData(p),
      };
      await this.push.notifyAdmins('payment_due', event);
      await this.push.notifyProfiles({ ...event, kind: 'payment_due', profileIds: [draft.savedBy] });
    } catch (e) {
      this.log.error(`course draft clash ${subscriptionId}: ${errText(e)}`);
    }
  }

  private async tell(p: UnbookedPackage): Promise<void> {
    const event = {
      subject: `course_unbooked:${p.subscriptionId}`,
      title: ar.courseDue.unbookedTitle,
      vars: { student: p.student, left: ar.courseDue.unbookedText },
      data: noticeData(p),
    };
    await this.push.notifyAdmins('payment_due', event);
    const sellers = p.soldBy ? [p.soldBy] : [];
    await this.push.notifyProfiles({ ...event, kind: 'payment_due', profileIds: sellers });
  }
}

const noticeData = (p: UnbookedPackage) => courseNoticeData(p.studentId, p.phone);
