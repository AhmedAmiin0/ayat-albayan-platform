import type { AdminTaskKind } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';

export interface Recipient {
  studentName: string;
  guardianId: string;
  phone: string;
}

export interface RenewalMessage {
  recipient: Recipient;
  params: Record<string, string>;
  dedupKey: string;
  now: Date;
}

/** Reads and idempotent writes for the R-SUB-02 alerts (dedup keys, rule 8). */
@Injectable()
export class AlertsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async studentsOfLessons(lessonIds: readonly string[]): Promise<string[]> {
    if (lessonIds.length === 0) return [];
    const { data, error } = await this.db
      .from('lesson_students')
      .select('student_id')
      .in('lesson_id', [...lessonIds]);
    if (error) throw dbError(error);
    return [...new Set(data.map((r) => r.student_id))];
  }

  /** Every student with a package (the sweep). ponytail: one read; page it past ~10k packages. */
  async studentsWithPackages(): Promise<string[]> {
    const { data, error } = await this.db.from('subscriptions').select('student_id');
    if (error) throw dbError(error);
    return [...new Set(data.map((r) => r.student_id))];
  }

  /**
   * insert … on conflict (dedup_key) do nothing. `title` keeps the balance line when it was raised
   * («فاضل حلقتين»): the UI fills {left} of dashboard.task.renewal_due with it.
   */
  async raiseTask(task: { kind: AdminTaskKind; subjectId: string; dedupKey: string; title: string }): Promise<void> {
    const { error } = await this.db.from('admin_tasks').upsert(
      {
        kind: task.kind,
        subject_type: 'subscription',
        subject_id: task.subjectId,
        dedup_key: task.dedupKey,
        title: task.title,
      },
      { onConflict: 'dedup_key', ignoreDuplicates: true },
    );
    if (error) throw dbError(error);
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

  /** The guardian's renewal reminder, queued for the Phase 4 sender; deduped per package. */
  async queueRenewal(m: RenewalMessage): Promise<void> {
    const { error } = await this.db.from('messages').upsert(
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
    );
    if (error) throw dbError(error);
  }
}
