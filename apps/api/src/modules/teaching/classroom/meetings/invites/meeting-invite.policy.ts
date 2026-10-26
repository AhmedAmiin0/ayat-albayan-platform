import { mayInvitePhones, systemPermissionsOf, type MeetingInviteeView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../../common/auth/verify-token';
import { assertCanSend, TeacherScopes, type TeacherScope } from '../../../../messaging/inbox/teacher-threads/teacher-scope';

/**
 * Who may send WhatsApp through meeting invitations (owner policy 2026-10-13, R-MEET-02):
 * - typed phones and every student: admin and sales only (mayInvitePhones);
 * - a chat text needs inbox.send: admin and sales to any phone, a teacher only to a phone the
 *   inbox lets them write to (assertCanSend on their TeacherScope); anyone else (a classroom
 *   assistant, a custom role without inbox.send) never queues WhatsApp: the invitee is recorded
 *   as a link (window_closed, chat_not_allowed) and the creator copies the link and invitation.
 */
export interface InvitePolicy {
  /** admin / sales: every student, typed phones, a known guardian's name and the exact error codes. */
  seesAll: boolean;
  mayChat: (phone: string) => boolean;
  /** messages.sent_by_teacher_id of the texts this caller queues: a teacher's own id, else null. */
  teacherId: string | null;
}

export const CHAT_NOT_ALLOWED = 'chat_not_allowed';

/** The AuthGuard always sets permissions; a bare AuthUser (an internal call) falls back to its system role's. */
const heldOf = (user: Pick<AuthUser, 'role' | 'permissions'>) => user.permissions ?? (user.role ? systemPermissionsOf(user.role) : []);

/** True when the inbox would let this teacher send to this phone (their families, never their own chat). */
export function teacherMaySend(scope: TeacherScope, phone: string): boolean {
  try {
    assertCanSend(scope, phone);
    return true;
  } catch {
    return false;
  }
}

/**
 * The error code a non-'all' caller sees: no_thread and session_closed read the same, so a typed or
 * picked number never reveals whether the academy has ever chatted with that family.
 */
export function visibleCode(code: string | null, seesAll: boolean): string | null {
  return !seesAll && code === 'no_thread' ? 'session_closed' : code;
}

/**
 * What a non-'all' caller sees of an invitee: the masked error code, and no name on a typed phone (a
 * known guardian's name, or the number itself; the clients show «رقم هاتف»). Masked on read only: the
 * stored name is what inviteeWhen compares with the phone.
 */
export const visibleView = <T extends MeetingInviteeView>(view: T, seesAll: boolean): T => ({
  ...view,
  error_code: visibleCode(view.error_code, seesAll),
  ...(!seesAll && view.kind === 'phone' ? { display_name: '' } : {}),
});

@Injectable()
export class MeetingInvitePolicies {
  constructor(private readonly teachers: TeacherScopes) {}

  async of(user: AuthUser): Promise<InvitePolicy> {
    const seesAll = mayInvitePhones(user.role);
    if (!heldOf(user).includes('inbox.send')) return { seesAll, mayChat: () => false, teacherId: null };
    if (seesAll) return { seesAll, mayChat: () => true, teacherId: null };
    if (user.role !== 'teacher') return { seesAll, mayChat: () => false, teacherId: null };
    const scope = await this.teachers.of(user).catch(() => null);
    return { seesAll, mayChat: (phone) => scope !== null && teacherMaySend(scope, phone), teacherId: scope?.teacherId ?? null };
  }
}
