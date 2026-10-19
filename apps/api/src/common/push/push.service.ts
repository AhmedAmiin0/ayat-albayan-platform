import { webNotificationPath, type PushKind } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB, type Db } from '../db/db.module';
import { pushText, type PushText } from './expo-push';
import { PushAudience, type Recipient } from './push.audience';
import { PushChannels } from './push.channels';

export type { PushTransport } from './expo-deliver';
export { PUSH_TRANSPORT } from './push.channels';

export interface PushEvent {
  /** What the event is about, for the dedup key: a lead id, message id, lesson id, … */
  subject: string;
  /** Fills the {slots} of ar.json notifications.<kind>. */
  vars: Record<string, string | number>;
  /** Delivered to the app for navigation, e.g. { phone } or { lessonId }. */
  data?: Record<string, string>;
  /** Replaces notifications.<kind>.title (a reschedule request is not just «رسالة جديدة»). */
  title?: string;
}

/** One event for the given profiles (a teacher's new student, …). */
export interface PushTarget extends PushEvent {
  kind: PushKind;
  profileIds: readonly string[];
}

type Delivery = {
  profile: Recipient;
  target: PushTarget;
  text: PushText;
  data: Record<string, string>;
};

/**
 * The bell and its pushes (R-MOB-01, R-NOT-01, R-NOT-02; docs/12 §6). One push_notifications row per
 * event per profile, keyed `{kind}:{subject}:{profile_id}` (written even with no device: the bell
 * shows it), so a retried event never pushes twice (rule 8). Only enabled profiles permitted for the
 * kind (PushAudience). The row is awaited; the browser and app pushes of a NEW row are not
 * (PushChannels, off the request path). Never throws: a push failure must not fail the webhook, a
 * booking, the sender or a job.
 */
@Injectable()
export class PushService {
  private readonly log = new Logger(PushService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audience: PushAudience,
    private readonly channels: PushChannels,
  ) {}

  /** Every enabled base-role admin (still filtered by permission per kind). */
  async notifyAdmins(kind: PushKind, event: PushEvent): Promise<void> {
    try {
      await this.notifyProfiles({ ...event, kind, profileIds: await this.audience.adminIds() });
    } catch (e) {
      this.warn(`${kind}:${event.subject}`, e);
    }
  }

  /**
   * An assistant's alert (docs/21 §6): the family's owners permitted for the kind; none (a new lead,
   * an unowned family, or no owner eligible) → every enabled salesperson. An admin owner's row
   * deduplicates against notifyAdmins (same dedup key), so it does not spread to the assistants.
   */
  async notifySales(kind: PushKind, event: PushEvent, owners: readonly string[]): Promise<void> {
    try {
      const owned = owners.length ? await this.audience.recipients(kind, owners) : [];
      const ids = owned.length ? owned.map((p) => p.id) : await this.audience.salesIds();
      await this.notifyProfiles({ ...event, kind, profileIds: ids });
    } catch (e) {
      this.warn(`${kind}:${event.subject}`, e);
    }
  }

  async notifyProfiles(target: PushTarget): Promise<void> {
    try {
      const ids = [...new Set(target.profileIds)];
      if (ids.length === 0) return;
      const profiles = await this.audience.recipients(target.kind, ids);
      const text = {
        ...pushText(target.kind, target.vars),
        ...(target.title ? { title: target.title } : {}),
      };
      const data = { kind: target.kind, ...target.data };
      for (const profile of profiles) await this.deliver({ profile, target, text, data });
    } catch (e) {
      this.warn(`${target.kind}:${target.subject}`, e);
    }
  }

  /** One profile: the row (awaited), then (new rows only) the browsers and the app, not awaited. */
  private async deliver({ profile, target, text, data }: Delivery): Promise<void> {
    try {
      const { data: inserted, error } = await this.db
        .from('push_notifications')
        .upsert(
          { profile_id: profile.id, kind: target.kind, ...text, data, dedup_key: `${target.kind}:${target.subject}:${profile.id}` },
          { onConflict: 'dedup_key', ignoreDuplicates: true },
        )
        .select('id');
      if (error) throw new Error(error.message);
      const row = inserted[0];
      if (!row) return; // already notified
      const web = {
        ...text,
        url: webNotificationPath(data, profile.role),
        tag: `${target.kind}:${target.subject}`,
      };
      void this.channels.send({ profile, rowId: row.id, text, data, web });
    } catch (e) {
      this.warn(`${target.kind}:${target.subject} → ${profile.id}`, e);
    }
  }

  private warn(what: string, e: unknown): void {
    this.log.warn(`push ${what} failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
