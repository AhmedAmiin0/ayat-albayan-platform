import type { NotificationItem, NotificationsPage, NotificationsQuery } from '@ab/shared';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { dbError } from '../http/http';
import { DB, type Db } from '../db/db.module';
import { notificationItem } from './notifications.mapper';
import { assertBrowserClaim } from './web/web-push.claim';
import type { WebPushSubscriptionInput } from './web/web-push.endpoint';

/** A retimed lesson's superseded rows (migration 174 appends «:old:<uuid>» to their dedup_key). */
const SUPERSEDED = '%:old:%';
const COLUMNS = 'id, kind, title, body, data, created_at, read_at';
/** Browsers kept per profile (the newest): a script cannot grow one user's fan-out without bound. */
export const WEB_PUSH_MAX_PER_PROFILE = 10;

/**
 * The caller's bell (R-NOT-01) and browsers (R-NOT-02). Service role: EVERY query is scoped to
 * the caller's profile id here, never to an id from the request.
 */
@Injectable()
export class NotificationsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(profileId: string, q: NotificationsQuery): Promise<NotificationsPage> {
    const from = (q.page - 1) * q.pageSize;
    const [rows, unread] = await Promise.all([
      this.db
        .from('push_notifications')
        .select(COLUMNS, { count: 'exact' })
        .eq('profile_id', profileId)
        .not('dedup_key', 'like', SUPERSEDED)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, from + q.pageSize - 1),
      this.db
        .from('push_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .is('read_at', null)
        .not('dedup_key', 'like', SUPERSEDED),
    ]);
    if (rows.error) throw dbError(rows.error);
    if (unread.error) throw dbError(unread.error);
    const items: NotificationItem[] = rows.data.map(notificationItem);
    return { items, total: rows.count ?? items.length, page: q.page, pageSize: q.pageSize, unread: unread.count ?? 0 };
  }

  /** Stamps read_at on the caller's unread rows: the given ids, or all of them. */
  async readMine(profileId: string, ids?: readonly string[]): Promise<void> {
    let query = this.db
      .from('push_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('profile_id', profileId)
      .is('read_at', null);
    if (ids) query = query.in('id', [...ids]);
    const { error } = await query;
    if (error) throw dbError(error);
  }

  /**
   * One row per browser, bound to the caller's session (its end deletes the row: migration 700): a
   * known endpoint moves to the caller (the browser signed in as someone else) and counts as new again. Then only the caller's newest WEB_PUSH_MAX_PER_PROFILE stay.
   * Never another person's live browser on its endpoint alone: 409 (assertBrowserClaim).
   */
  async subscribe(profileId: string, sub: WebPushSubscriptionInput, sessionId: string): Promise<void> {
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
    if (error) throw dbError(error);
    const extra = await this.db
      .from('web_push_subscriptions')
      .select('id')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(WEB_PUSH_MAX_PER_PROFILE, WEB_PUSH_MAX_PER_PROFILE + 999);
    if (extra.error) throw dbError(extra.error);
    if (extra.data.length === 0) return;
    const del = await this.db
      .from('web_push_subscriptions')
      .delete()
      .eq('profile_id', profileId)
      .in(
        'id',
        extra.data.map((r) => r.id),
      );
    if (del.error) throw dbError(del.error);
  }

  /** The caller's own row only; 204 even when there was none. */
  async unsubscribe(profileId: string, endpoint: string): Promise<void> {
    const { error } = await this.db.from('web_push_subscriptions').delete().eq('profile_id', profileId).eq('endpoint', endpoint);
    if (error) throw dbError(error);
  }
}
