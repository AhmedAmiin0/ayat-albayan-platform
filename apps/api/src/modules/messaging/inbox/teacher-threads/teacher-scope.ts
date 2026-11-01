import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { waHttpError } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { TeacherThreadsRepo } from './teacher-threads.repo';

/**
 * What a signed-in teacher may see in the inbox (owner decision 2026-10-02, R-TCH-03, R-MSG-05):
 * the chats of guardians whose children they teach, plus their own chat with the academy. The family
 * of a student not subscribed yet (new, trial, pending_subscription) is not in it (owner 2026-10-11,
 * 2026-10-15: sales or the system manages between them).
 */
export interface TeacherScope {
  teacherId: string;
  teacherName: string;
  /** teacher_thread_phones (migrations 164, 165, 20261007000001, 20261015000441), E.164. */
  phones: ReadonlySet<string>;
  /** The teacher's own number: visible, read-only. */
  ownPhone: string | null;
}

/** 403 not_your_thread for any phone outside the teacher's scope (rule 9, server-side). */
export function assertPhone(scope: TeacherScope, phone: string): void {
  if (!scope.phones.has(phone)) throw waHttpError('not_your_thread', 403);
}

/** A send also stays off the teacher's own chat with the academy (403 own_thread_read_only). */
export function assertCanSend(scope: TeacherScope, phone: string): void {
  assertPhone(scope, phone);
  if (phone === scope.ownPhone) throw waHttpError('own_thread_read_only', 403);
}

/** Resolves the caller's scope once per request. */
@Injectable()
export class TeacherScopes {
  constructor(private readonly queries: TeacherThreadsRepo) {}

  /** null for an admin (everything); a teacher's scope, 404 teacher_not_linked without a row. */
  async of(user: AuthUser): Promise<TeacherScope | null> {
    if (user.role === 'admin') return null;
    if (user.role !== 'teacher') throw new ForbiddenException();
    const teacher = await this.queries.teacher(user.id);
    if (!teacher) throw notFound('teacher_not_linked');
    const phones = await this.queries.phones(teacher.id);
    return { teacherId: teacher.id, teacherName: teacher.display_name_ar, phones: new Set(phones), ownPhone: teacher.phone_e164 };
  }
}
