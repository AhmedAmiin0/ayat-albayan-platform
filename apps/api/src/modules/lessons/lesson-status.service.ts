import {
  applyLessonEvent,
  isChargeable,
  type Attendance,
  type LessonStatus,
  type StatusRouteEvent,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { SettingsService } from '../../common/settings/settings.service';
import { conflict, errorCode } from '../scheduling/errors';
import { LessonAccess } from './lesson-access';
import type { LessonRow } from './lesson-row';
import { LessonStore } from './lesson-store';
import { invalidTransition } from './transition';

const ATTENDANCE: Record<StatusRouteEvent, Attendance> = {
  complete: 'on_time',
  mark_late: 'late',
  mark_no_show: 'absent',
  excuse: 'excused',
};
/** Outcomes that only make sense once the lesson has started; `excuse` is allowed any time. */
const AFTER_START: ReadonlySet<StatusRouteEvent> = new Set(['complete', 'mark_late', 'mark_no_show']);

/** `actor` null = the guardian's WhatsApp «نعم» (Phase 4 webhook): confirmed_by stays null. */
export type ConfirmInput = { lessonId: string; actor: AuthUser | null };
export type StatusInput = { lessonId: string; event: StatusRouteEvent; actor: AuthUser };

const audit = (lesson: LessonRow, opts: { actorId: string | null; action: string; after: object }) => ({
  actorId: opts.actorId,
  entity: 'lessons',
  entityId: lesson.id,
  action: opts.action,
  before: { status: lesson.status },
  after: { ...opts.after },
});

/**
 * Confirm + attendance outcomes through the shared state machine, compare-and-set on status
 * (R-SCH-03, R-SCH-08, issue B2). Both return the lesson id; the controller maps the view.
 */
@Injectable()
export class LessonStatusService {
  constructor(
    private readonly store: LessonStore,
    private readonly access: LessonAccess,
    private readonly settings: SettingsService,
  ) {}

  /** scheduled → confirmed. Already confirmed → unchanged (a guardian may answer «نعم» twice). */
  async confirm({ lessonId, actor }: ConfirmInput): Promise<string> {
    const lesson = await this.store.get(lessonId);
    if (actor) await this.access.assertCanTouch(actor, lesson);
    if (lesson.status === 'confirmed') return lesson.id;
    if (!applyLessonEvent(lesson.status, 'confirm')) throw invalidTransition(lesson.status, 'confirm');
    const actorId = actor?.id ?? null;
    const change = {
      id: lesson.id,
      from_status: lesson.status,
      to_status: 'confirmed' as const,
      confirmed_at: new Date().toISOString(),
      confirmed_by: actorId,
    };
    try {
      await this.store.commit({
        change: { actor: actorId, changes: [change] },
        audit: audit(lesson, { actorId, action: 'confirm', after: { status: 'confirmed' } }),
        transition: { from: lesson.status, event: 'confirm' },
      });
    } catch (e) {
      // Lost the compare-and-set: fine when someone else confirmed it meanwhile.
      if (errorCode(e) !== 'invalid_transition') throw e;
      if ((await this.store.get(lessonId)).status !== 'confirmed') throw e;
    }
    return lesson.id;
  }

  /** complete | mark_late | mark_no_show | excuse → status, attendance and chargeable. */
  async changeStatus({ lessonId, event, actor }: StatusInput): Promise<string> {
    const lesson = await this.store.get(lessonId);
    await this.access.assertCanTouch(actor, lesson);
    const to = applyLessonEvent(lesson.status, event);
    if (!to) throw invalidTransition(lesson.status, event);
    const now = new Date();
    if (AFTER_START.has(event) && now < new Date(lesson.starts_at)) throw conflict('not_started');
    const chargeable = await this.chargeable(lesson, { to, now });
    const change = { id: lesson.id, from_status: lesson.status, to_status: to, attendance: ATTENDANCE[event], chargeable };
    await this.store.commit({
      change: { actor: actor.id, changes: [change] },
      audit: audit(lesson, { actorId: actor.id, action: 'status_change', after: { status: to, chargeable } }),
      transition: { from: lesson.status, event },
    });
    return lesson.id;
  }

  /** lesson_students.chargeable for the new status (shared isChargeable, R-SCH-07). */
  private async chargeable(lesson: LessonRow, at: { to: LessonStatus; now: Date }): Promise<boolean> {
    return isChargeable({
      status: at.to,
      startsAt: new Date(lesson.starts_at),
      at: at.now,
      lateCancelHours: await this.settings.lateCancelHours(),
    });
  }
}
