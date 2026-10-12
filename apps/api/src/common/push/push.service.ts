import { webNotificationPath, type PushKind, type UserRole } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB, type Db } from '../db/db.module';
import { expoDeliver, type PushTransport } from './expo-deliver';
import { pushText, type PushText } from './expo-push';
import { WebPushSender } from './web-push.sender';

export type { PushTransport } from './expo-deliver';
export const PUSH_TRANSPORT = Symbol('PUSH_TRANSPORT');

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

interface Recipient {
  id: string;
  role: UserRole | null;
  push_tokens: string[];
}

type Delivery = { profile: Recipient; target: PushTarget; text: PushText; data: Record<string, string> };

/**
 * The bell and its pushes (R-MOB-01, R-NOT-01, R-NOT-02; docs/12 §6). One push_notifications row per
 * event per profile, keyed `{kind}:{subject}:{profile_id}` (written even with no device: the bell
 * shows it), so a retried event never pushes twice (rule 8); only a NEW row goes to the profile's
 * app devices (Expo) and browsers (web push). Never throws: a push failure must not fail the
 * webhook, a booking, the sender or a job.
 */
@Injectable()
export class PushService {
  private readonly log = new Logger(PushService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(PUSH_TRANSPORT) private readonly transport: PushTransport,
    private readonly web: WebPushSender,
  ) {}

  /** Every base-role admin (unchanged recipients of the admin events). */
  async notifyAdmins(kind: PushKind, event: PushEvent): Promise<void> {
    try {
      const { data, error } = await this.db.from('profiles').select('id').eq('role', 'admin');
      if (error) throw new Error(error.message);
      await this.notifyProfiles({ ...event, kind, profileIds: data.map((p) => p.id) });
    } catch (e) {
      this.warn(`${kind}:${event.subject}`, e);
    }
  }

  async notifyProfiles(target: PushTarget): Promise<void> {
    try {
      const ids = [...new Set(target.profileIds)];
      if (ids.length === 0) return;
      const { data: profiles, error } = await this.db.from('profiles').select('id, role, push_tokens').in('id', ids);
      if (error) throw new Error(error.message);
      const text = { ...pushText(target.kind, target.vars), ...(target.title ? { title: target.title } : {}) };
      const data = { kind: target.kind, ...target.data };
      for (const profile of profiles) await this.deliver({ profile, target, text, data });
    } catch (e) {
      this.warn(`${target.kind}:${target.subject}`, e);
    }
  }

  /** One profile: the row, then (new rows only) the app and the browsers. A failure stays with this profile. */
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
      await this.web.send(profile.id, { ...text, url: webNotificationPath(data, profile.role), tag: `${target.kind}:${target.subject}` });
      await expoDeliver({ db: this.db, transport: this.transport, profile, rowId: row.id, text, data });
    } catch (e) {
      this.warn(`${target.kind}:${target.subject} → ${profile.id}`, e);
    }
  }

  private warn(what: string, e: unknown): void {
    this.log.warn(`push ${what} failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
