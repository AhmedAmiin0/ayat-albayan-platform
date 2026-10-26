import { mayReceivePush, type PushKind, type UserRole } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AccountDisabledError,
  PERMISSION_RESOLVER,
  type PermissionResolver,
} from '../auth/permissions';
import { NotificationPolicy } from '../../modules/notification-rules/policy/policy';
import { DB, type Db } from '../db/db.module';
import { pushRoute, type PushRoute } from './push.rules';
import { liveTokens } from './push.sessions';

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
  async route(kind: PushKind): Promise<PushRoute> {
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

  async recipients(kind: PushKind, ids: readonly string[]): Promise<Recipient[]> {
    const { data, error } = await this.db
      .from('profiles')
      .select('id, role, push_tokens')
      .in('id', [...ids])
      .is('disabled_at', null);
    if (error) throw new Error(error.message);
    const allowed = await Promise.all(data.map((p) => this.permitted(kind, p)));
    // Their devices: only tokens bound to a live session of theirs (signed out / revoked = none).
    return liveTokens(
      this.db,
      data.filter((_, i) => allowed[i]),
    );
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

  private async permitted(kind: PushKind, profile: Recipient): Promise<boolean> {
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
