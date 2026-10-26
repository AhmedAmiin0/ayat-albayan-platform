import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { SalesScopes, type SalesScope } from '../../../sales/sales/sales-scope';
import { assertCanSend, TeacherScopes, type TeacherScope } from '../../inbox/teacher-threads/teacher-scope';

/**
 * Who is calling, resolved server-side per request exactly like a send from the thread (rule 9,
 * ThreadsController.scopes): a salesperson (every chat), a teacher (their families' chats only, never
 * their own chat with the academy) or the admin. Any other role is refused by TeacherScopes (403).
 */
export interface CallActor {
  user: AuthUser;
  teacher: TeacherScope | null;
  sales: SalesScope | null;
}

/** May this actor see (and so hear ring) a call with this phone? */
export function maySee(actor: CallActor, phone: string): boolean {
  if (!actor.teacher) return true;
  return actor.teacher.phones.has(phone) && phone !== actor.teacher.ownPhone;
}

/** 403 not_your_thread / own_thread_read_only, as for a text (teacher-scope.ts). */
export function assertMayCall(actor: CallActor, phone: string): void {
  if (actor.teacher) assertCanSend(actor.teacher, phone);
}

/** The phones a teacher's calls log is narrowed to; null = every chat (admin, sales). */
export const phonesOf = (actor: CallActor): readonly string[] | null => (actor.teacher ? [...actor.teacher.phones] : null);

@Injectable()
export class CallAccess {
  constructor(
    private readonly teachers: TeacherScopes,
    private readonly sales: SalesScopes,
  ) {}

  async actor(user: AuthUser): Promise<CallActor> {
    const sales = await this.sales.of(user);
    return { user, sales, teacher: sales ? null : await this.teachers.of(user) };
  }
}
