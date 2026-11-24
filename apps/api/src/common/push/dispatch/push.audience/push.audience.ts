import { mayReceivePush } from '@ab/shared';
import type { AnyPushKind, UserRole } from '@ab/catalog';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AccountDisabledError,
  PERMISSION_RESOLVER,
  type PermissionResolver,
} from '@/common/auth/permissions';
import { NotificationPolicy } from '@/modules/messaging/notification-rules/policy/policy';
import { DB, type Db } from '@/common/db/db.module';
import { pushRoute, type PushRoute } from '@/common/push/dispatch/push.rules';
import { readersOf, studentLogins } from '@/common/push/dispatch/push.readers';
import { liveTokens } from '@/common/push/dispatch/push.sessions';

/** A profile a notification may go to (enabled, permitted for its kind); push_tokens: live ones only. */
export interface Recipient {
  id: string;
  role: UserRole | null;
  push_tokens: string[];
}

/**
 * Who gets a notification, decided at send time (R-NOT-01): never a disabled profile (disabled_at
 * set), and only a profile whose effective permissions (the AuthGuard's resolver) hold what
 * PUSH_KIND_PERMISSIONS asks of the kind — a custom role without notifications.push (or, for an
 * inbox event, inbox.read) gets no bell row, no browser push, no app push. And whether the kind goes
 * out at all, and through which channels: its notification rule (route, NotificationPolicy).
 */
@Injectable()
export class PushAudience {
  private readonly log = new Logger(PushAudience.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(PERMISSION_RESOLVER) private readonly resolve: PermissionResolver,
    private readonly policy: NotificationPolicy,
  ) {}

  /** The kind's rule: off → no row; push not among its channels → the bell row only (pushRoute). */
  async route(kind: AnyPushKind): Promise<PushRoute> {
    const snap = await this.policy.snapshot();
    if (!snap) this.log.warn(`notification rules unread: ${kind} goes to the bell only`);
    return pushRoute(snap, kind);
  }

  /** Every enabled base-role admin (the admin events' candidates). */
  adminIds(): Promise<string[]> {
    return this.roleIds('admin');
  }

  /** Every enabled base-role salesperson (an assistant): unowned and new-lead chats (docs/21 §6). */
  salesIds(): Promise<string[]> {
    return this.roleIds('sales');
  }

  async recipients(kind: AnyPushKind, ids: readonly string[]): Promise<Recipient[]> {
    const { data, error } = await this.db
      .from('profiles')
      .select('id, role, push_tokens')
      .in('id', [...ids])
      .is('disabled_at', null);
    if (error) throw new Error(error.message);
    const allowed = await Promise.all(data.map((p) => this.permitted(kind, p)));
    const permitted = data.filter((_, i) => allowed[i]);
    // A child student: lesson and report kinds only, never money (docs/50 §4).
    const readers = readersOf(kind, permitted, await this.adults(studentLogins(permitted)));
    // Their devices: only tokens bound to a live session of theirs (signed out / revoked = none).
    return liveTokens(this.db, readers);
  }

  /**
   * The student logins that are their own contact (students.contact_is_self): a family reader.
   * A failed lookup answers none, so every student reads as a child (fail closed: no money news).
   */
  private async adults(ids: readonly string[]): Promise<ReadonlySet<string>> {
    if (ids.length === 0) return new Set();
    const { data, error } = await this.db
      .from('students')
      .select('profile_id')
      .in('profile_id', [...ids])
      .eq('contact_is_self', true);
    return new Set(error ? [] : data.flatMap((s) => (s.profile_id ? [s.profile_id] : [])));
  }

  private async roleIds(role: 'admin' | 'sales'): Promise<string[]> {
    const { data, error } = await this.db
      .from('profiles')
      .select('id')
      .eq('role', role)
      .is('disabled_at', null);
    if (error) throw new Error(error.message);
    return data.map((p) => p.id);
  }

  private async permitted(kind: AnyPushKind, profile: Recipient): Promise<boolean> {
    try {
      return mayReceivePush(
        kind,
        await this.resolve({ id: profile.id, email: null, role: profile.role }),
      );
    } catch (e) {
      // Disabled in the meantime: skip quietly. Anything else: skip this profile, say why.
      if (!(e instanceof AccountDisabledError))
        this.log.warn(
          `push permissions of ${profile.id}: ${e instanceof Error ? e.message : String(e)}`,
        );
      return false;
    }
  }
}
