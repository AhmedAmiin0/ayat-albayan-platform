import {
  encodeSyncCursor,
  type SyncCursor,
  type ThreadSync,
  type ThreadSyncQuery,
} from '@ab/shared';
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { OwnNumbers } from '@/modules/messaging/numbers';
import type { ThreadMessageRow } from '@/modules/messaging/whatsapp';
import { ThreadReads } from '@/modules/messaging/inbox/reads/thread-reads';
import { SYNC_START, SyncRepo } from './sync.repo';
import { syncScope, visibleTo, type SyncScope } from './sync-scope';
import { SyncThreads } from './sync-threads';
import { SyncViews } from './sync-views';
import type { DeltaCaller } from './thread-delta.service';

const stampOf = (r: ThreadMessageRow): SyncCursor => ({ at: r.updated_at, id: r.id });
/** The last scanned row's stamp; nothing scanned = the asked cursor back (null on a first sync). */
const cursorOf = (c: SyncCursor | undefined): string | null => (c ? encodeSyncCursor(c) : null);

/**
 * GET /threads/sync (owner 2026-11-06, docs/43 §5 row 43-5): every message row that changed after
 * the cursor, oldest change first, in the caller's scope — the same as reading each chat (rule 9):
 * the admin every chat, a salesperson every chat without the signed-link templates (redacted), a
 * teacher her scope's phones; the academy's own numbers never. A scanned row the caller can't hold
 * comes back as a `gone` id. The answer's `scope` key changes with role, chats and own numbers, so
 * the phone wipes rows it should no longer hold. Writes nothing (no read stamp: that stays with
 * opening a chat).
 */
@Injectable()
export class ThreadSyncService {
  /** The academy's own numbers (property-injected: the constructor is at its 4-parameter limit). */
  @Optional() @Inject(OwnNumbers) private readonly own?: OwnNumbers;

  constructor(
    private readonly reads: ThreadReads,
    private readonly repo: SyncRepo,
    private readonly threads: SyncThreads,
    private readonly views: SyncViews,
  ) {}

  async sync(q: ThreadSyncQuery, user: AuthUser): Promise<ThreadSync> {
    const caller = await this.callerOf(user);
    const scope = syncScope(caller, await this.ownPhones());
    const after = q.since ?? SYNC_START;
    const rows =
      scope.phones?.length === 0 ? [] : await this.page(scope, { after, limit: q.limit });
    const page = rows.slice(0, q.limit);
    const end = page.at(-1) ?? null;
    const shown = page.filter((r) => visibleTo(caller.kind, r));
    const [messages, threads] = await Promise.all([
      this.views.render(shown, caller.kind),
      this.threads.of({ phones: shown.map((r) => r.phone_e164), hide: scope.hide, caller }),
    ]);
    return {
      messages,
      threads,
      gone: page.filter((r) => !visibleTo(caller.kind, r)).map((r) => r.id),
      cursor: cursorOf(end ? stampOf(end) : q.since),
      has_more: rows.length > q.limit,
      scope: scope.key,
    };
  }

  private page(scope: SyncScope, at: { after: SyncCursor; limit: number }) {
    return this.repo.page({ ...at, phones: scope.phones, hide: scope.hide });
  }

  /** The same three scopes as GET /threads/:phone?after=, resolved in ThreadReads' order. */
  private async callerOf(user: AuthUser): Promise<DeltaCaller> {
    const sales = await this.reads.salesScope(user);
    if (sales) return { kind: 'sales' };
    const scope = await this.reads.scope(user);
    return scope ? { kind: 'teacher', scope } : { kind: 'admin' };
  }

  private async ownPhones(): Promise<ReadonlySet<string>> {
    return this.own ? this.own.phones() : new Set();
  }
}
