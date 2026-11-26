import type { NotificationItem, NotificationsPage, NotificationsQuery } from '@ab/shared';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { done, pgError } from '@/common/db/errors';
import { DB, type Db } from '@/common/db/db.module';
import type { SortSpec } from '@/common/db/list-sort';
import { readPage, toPage } from '@/common/db/page';
import { notificationItem } from './notifications.mapper';
import { assertBrowserClaim } from './web/web-push.claim';
import type { WebPushSubscriptionInput } from './web/web-push.endpoint';

/** A retimed lesson's superseded rows (migration 174 appends «:old:<uuid>» to their dedup_key). */
const SUPERSEDED = '%:old:%';
const COLUMNS = 'id, kind, title, body, data, created_at, read_at';
const NEWEST_FIRST: SortSpec<never> = {
  columns: {},
  fallback: [
    { column: 'created_at', ascending: false },
    { column: 'id', ascending: false },
  ],
};
/** Browsers kept per profile (the newest): a script cannot grow one user's fan-out without bound. */
export const WEB_PUSH_MAX_PER_PROFILE = 10;

/**
 * The caller's bell (R-NOT-01) and browsers (R-NOT-02). Service role: EVERY query is scoped to
 * the caller's profile id here, never to an id from the request.
 */
@Injectable()
export class NotificationsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(profileId: string, q: NotificationsQuery): Promise<NotificationsPage> {
    const mine = () =>
      this.db
        .from('push_notifications')
        .select(COLUMNS, { count: 'exact' })
        .eq('profile_id', profileId)
        .not('dedup_key', 'like', SUPERSEDED);
    const [read, unread] = await Promise.all([
      readPage(mine, q, NEWEST_FIRST),
      this.db
        .from('push_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .is('read_at', null)
        .not('dedup_key', 'like', SUPERSEDED),
    ]);
    if (unread.error) throw pgError(unread.error);
    const items: NotificationItem[] = read.rows.map(notificationItem);
    return { ...toPage(items, read.total, q), unread: unread.count ?? 0 };
  }

  /** Stamps read_at on the caller's unread rows: the given ids, or all of them. */
  async readMine(profileId: string, ids?: readonly string[]): Promise<void> {
    let query = this.db
      .from('push_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('profile_id', profileId)
      .is('read_at', null);
    if (ids) query = query.in('id', [...ids]);
    done(await query);
  }

  /**
   * One row per browser, bound to the caller's session (its end deletes the row: migration 700): a
   * known endpoint moves to the caller (the browser signed in as someone else) and counts as new again. Then only the caller's newest WEB_PUSH_MAX_PER_PROFILE stay.
   * Never another person's live browser on its endpoint alone: 409 (assertBrowserClaim).
   */
  async subscribe(
    profileId: string,
    sub: WebPushSubscriptionInput,
    sessionId: string,
  ): Promise<void> {
    await assertBrowserClaim(this.db, { profileId, sub });
    const row = {
      profile_id: profileId,
      session_id: sessionId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      created_at: new Date().toISOString(),
    };
    const { error } = await this.db
      .from('web_push_subscriptions')
      .upsert(row, { onConflict: 'endpoint' });
    // foreign_key_violation: the session just ended. 401 like PUT /me/push-tokens, nothing bound.
    if (error?.code === '23503') throw new UnauthorizedException('no_session');
    if (error) throw pgError(error);
    const extra = await this.db
      .from('web_push_subscriptions')
      .select('id')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(WEB_PUSH_MAX_PER_PROFILE, WEB_PUSH_MAX_PER_PROFILE + 999);
    if (extra.error) throw pgError(extra.error);
    if (extra.data.length === 0) return;
    const del = await this.db
      .from('web_push_subscriptions')
      .delete()
      .eq('profile_id', profileId)
      .in(
        'id',
        extra.data.map((r) => r.id),
      );
    if (del.error) throw pgError(del.error);
  }

  /** The caller's own row only; 204 even when there was none. */
  async unsubscribe(profileId: string, endpoint: string): Promise<void> {
    done(await this.db.from('web_push_subscriptions').delete().eq('profile_id', profileId).eq('endpoint', endpoint));
  }
}
