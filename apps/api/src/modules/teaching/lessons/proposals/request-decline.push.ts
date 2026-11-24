import { joinNames, lessonWhenText, RIYADH_TZ } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ar } from '@/common/infra/i18n/server-text';
import { PushService, type PushTarget } from '@/common/push/push.service';
import { fill } from '@/modules/reporting/report-pdf';
import type { LessonRow } from '@/modules/teaching/lessons/store/lesson-row';
import { LessonStore } from '@/modules/teaching/lessons/store/lesson-store';
import type { ProposalRow } from './lesson-proposals.repo';

type Declined = Pick<ProposalRow, 'id' | 'lesson_id' | 'requested_by' | 'created_by'> & {
  decision_note: string | null;
};

/** The lesson keeps its time, shown on the student's clock, with the note. */
export function declineEvent(p: Declined, lesson: LessonRow, profileId: string): PushTarget {
  const first = lesson.lesson_students[0];
  const tz = first?.student?.tz ?? RIYADH_TZ;
  const names = lesson.lesson_students.map((s) => s.student?.name ?? '').filter(Boolean);
  const said = p.decision_note;
  const note = said ? ` ${fill(ar.portal.actions.decisionNote, { note: said })}` : '';
  return {
    kind: 'lesson_request_declined',
    subject: `request:${p.id}`,
    vars: { student: joinNames(names), when: lessonWhenText(new Date(lesson.starts_at), tz), note },
    data: { lessonId: lesson.id, ...(first ? { studentId: first.student_id } : {}) },
    profileIds: [profileId],
  };
}

const isFamilyAsk = (p: Declined): p is Declined & { created_by: string } =>
  p.requested_by === 'family' && p.created_by !== null;

/** Only family requests notify on decline; never throws, the answer is already saved. */
@Injectable()
export class RequestDeclinePush {
  private readonly log = new Logger(RequestDeclinePush.name);

  constructor(
    @Inject(PushService) private readonly push: PushService,
    @Inject(LessonStore) private readonly store: LessonStore,
  ) {}

  async notify(p: Declined): Promise<void> {
    if (!isFamilyAsk(p)) return;
    try {
      const lesson = await this.store.get(p.lesson_id);
      await this.push.notifyProfiles(declineEvent(p, lesson, p.created_by));
    } catch (e) {
      this.log.warn(`request ${p.id} decline: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
