import type { UserRole as Role } from '@ab/shared';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { TeachersRepo } from '@/modules/people/teachers/teachers.repo';

/**
 * A teacher acting through the signed per-lesson report link (no login, docs/19 «Teacher report
 * link»): the lesson's teacher, and their auth user when they have one (the audit actor; null =
 * none).
 */
export class LinkCaller {
  constructor(
    readonly teacherId: string,
    readonly profileId: string | null,
  ) {}
}

/** Who calls a report service: a signed-in user, or a teacher through their report link. */
export type ReportCaller = AuthUser | LinkCaller;

const viaLink = (c: ReportCaller): c is LinkCaller => c instanceof LinkCaller;

/** The caller's role for the edit window: a link is always the teacher. */
export const callerRole = (c: ReportCaller): Role | null => (viaLink(c) ? 'teacher' : c.role);

/** The audit actor (auth.users id): a link's teacher without an account writes none. */
export const callerActor = (c: ReportCaller): string | null => (viaLink(c) ? c.profileId : c.id);

/**
 * Who may touch which report (rule 9; the API is the only writer, migration 120): an admin any
 * report, a teacher only the lessons / reports whose teacher_id is their own teachers row.
 */
@Injectable()
export class ReportAccess {
  constructor(private readonly teachers: TeachersRepo) {}

  /** teachers.id of a signed-in teacher; 404 teacher_not_linked when no row has their profile. */
  async teacherId(user: AuthUser): Promise<string> {
    const id = await this.teachers.idByProfile(user.id);
    if (!id) throw notFound('teacher_not_linked');
    return id;
  }

  /** 403 unless admin, or the teacher of this lesson / report (a link: its own teacher only). */
  async assertTeacherOf(user: ReportCaller, row: { teacher_id: string }): Promise<void> {
    const owns = viaLink(user) ? user.teacherId === row.teacher_id : await this.signedIn(user, row);
    if (!owns) throw new ForbiddenException();
  }

  private async signedIn(user: AuthUser, row: { teacher_id: string }): Promise<boolean> {
    if (user.role === 'admin') return true;
    return user.role === 'teacher' && (await this.teachers.idByProfile(user.id)) === row.teacher_id;
  }
}
