import type { AdminTaskKind } from '@ab/catalog';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { NotificationPolicy } from '@/modules/messaging/notification-rules/policy/policy';
import { readAll, readChunked } from '@/common/db/read-all';
import { wakeOn } from '@/common/jobs';
import { dbError } from '@/common/http/http';
import type { OpenTask, Recipient, RenewalMessage } from './alerts.types';

/** Reads and idempotent writes for the R-SUB-02 alerts (dedup keys, rule 8). */
@Injectable()
export class AlertsRepo {
  private readonly log = new Logger(AlertsRepo.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly policy: NotificationPolicy,
  ) {}

  async studentsOfLessons(lessonIds: readonly string[]): Promise<string[]> {
    const data = await readChunked(lessonIds, (chunk) =>
      this.db.from('lesson_students').select('student_id').in('lesson_id', chunk),
    );
    return [...new Set(data.map((r) => r.student_id))];
  }

  /**
   * The sweep's students: a live package (not expired or cancelled), or a package changed since
   * `since`, so the last move to expired is still evaluated once (BE-07). Paged past max_rows.
   */
  async sweepStudents(since: Date): Promise<string[]> {
    const live = `status.not.in.(expired,cancelled),updated_at.gte."${since.toISOString()}"`;
    const data = await readAll((from, to) =>
      this.db.from('subscriptions').select('student_id').or(live).order('id').range(from, to),
    );
    return [...new Set(data.map((r) => r.student_id))];
  }

  /**
   * insert … on conflict (dedup_key) do nothing; true when the task is new. `title` keeps the
   * balance line when it was raised: the UI fills {left} of dashboard.task.renewal_due with it.
   */
  async raiseTask(task: { kind: AdminTaskKind; subjectId: string; dedupKey: string; title: string }): Promise<boolean> {
    const { data, error } = await this.db.from('admin_tasks').upsert(
      {
        kind: task.kind,
        subject_type: 'subscription',
        subject_id: task.subjectId,
        dedup_key: task.dedupKey,
        title: task.title,
      },
      { onConflict: 'dedup_key', ignoreDuplicates: true },
    ).select('id');
    if (error) throw dbError(error);
    return (data?.length ?? 0) > 0;
  }

  /**
   * Closes the open tasks about these packages whose dedup key is not in `keep` (done_by null: the
   * system closed it). The task stays in the list of done tasks for the record. A renewal message
   * still queued or held (auto_off) under a closed key (`renewal_due:{sub}`, the same key) is no
   * longer true — the package was renewed or paid — so it is failed as stale and never sent.
   */
  async closeTasks(input: { subjectIds: readonly string[]; keep: readonly string[]; now: Date }): Promise<void> {
    if (input.subjectIds.length === 0) return;
    let q = this.db
      .from('admin_tasks')
      .update({ done_at: input.now.toISOString(), done_by: null })
      .eq('subject_type', 'subscription')
      .in('subject_id', [...input.subjectIds])
      .is('done_at', null);
    if (input.keep.length > 0) q = q.not('dedup_key', 'in', `(${input.keep.map((k) => `"${k}"`).join(',')})`);
    const { data, error } = await q.select('dedup_key');
    if (error) throw dbError(error);
    await this.failStale((data ?? []).map((t) => t.dedup_key));
  }

  /** The open tasks about packages; few at any time (each is an admin to-do). */
  async openTasks(): Promise<OpenTask[]> {
    return readAll((from, to) =>
      this.db
        .from('admin_tasks')
        .select('subject_id, dedup_key')
        .eq('subject_type', 'subscription')
        .is('done_at', null)
        .order('id')
        .range(from, to),
    );
  }

  /** closeTasks for keys already chosen (the sweep reads the open tasks once for every student). */
  async closeKeys(keys: readonly string[], now: Date): Promise<void> {
    if (keys.length === 0) return;
    const { data, error } = await this.db
      .from('admin_tasks')
      .update({ done_at: now.toISOString(), done_by: null })
      .in('dedup_key', [...keys])
      .is('done_at', null)
      .select('dedup_key');
    if (error) throw dbError(error);
    await this.failStale(data.map((t) => t.dedup_key));
  }

  private async failStale(closed: readonly string[]): Promise<void> {
    if (closed.length === 0) return;
    const stale = await this.db
      .from('messages')
      .update({ status: 'failed', error_code: 'stale', error_text: 'renewal no longer due', next_attempt_at: null })
      .in('dedup_key', [...closed])
      .or('status.eq.queued,error_code.eq.auto_off');
    if (stale.error) throw dbError(stale.error);
  }

  async recipient(studentId: string): Promise<Recipient | null> {
    const { data, error } = await this.db
      .from('students')
      .select('name, guardian:guardians(id, phone_e164)')
      .eq('id', studentId)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data?.guardian) return null;
    return { studentName: data.name, guardianId: data.guardian.id, phone: data.guardian.phone_e164 };
  }

  /**
   * The guardian's renewal reminder, queued for the Phase 4 sender; deduped per package. Only while the
   * renewal_due notification rule is on (off or unreadable: nothing queued, logged; the task still stands).
   */
  async queueRenewal(m: RenewalMessage): Promise<void> {
    if (!(await this.policy.isOn('renewal_due'))) {
      this.log.log(`renewal_due off: ${m.dedupKey} not queued`);
      return;
    }
    const { data, error } = await this.db.from('messages').upsert(
      {
        direction: 'outbound',
        status: 'queued',
        phone_e164: m.recipient.phone,
        guardian_id: m.recipient.guardianId,
        template_key: 'renewal_due',
        template_params: m.params,
        dedup_key: m.dedupKey,
        scheduled_for: m.now.toISOString(),
      },
      { onConflict: 'dedup_key', ignoreDuplicates: true },
    ).select('id');
    if (error) throw dbError(error);
    wakeOn(data.length); // a new row wakes the sender (docs/42 42-1); a duplicate does not
  }
}
