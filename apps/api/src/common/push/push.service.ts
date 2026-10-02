import type { PushKind } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { withoutPushToken } from '../../modules/me/push-tokens';
import { DB, type Db } from '../db/db.module';
import { expoMessages, pushText, readTickets, type ExpoMessage, type ExpoTicket } from './expo-push';

/** Sends a batch to Expo and returns one ticket per message (injectable for tests). */
export type PushTransport = (messages: ExpoMessage[]) => Promise<ExpoTicket[]>;
export const PUSH_TRANSPORT = Symbol('PUSH_TRANSPORT');

export interface PushEvent {
  /** What the event is about, for the dedup key: a lead id, message id, lesson id, … */
  subject: string;
  /** Fills the {slots} of ar.json notifications.<kind>. */
  vars: Record<string, string | number>;
  /** Delivered to the app for navigation, e.g. { phone } or { lessonId }. */
  data?: Record<string, string>;
}

interface AdminRow {
  id: string;
  push_tokens: string[];
}

/**
 * Admin pushes (R-MOB-01, docs/12 §6). One push_notifications row per event per admin, keyed
 * `{kind}:{subject}:{profile_id}`, so a retried event never pushes twice (rule 8). Never throws:
 * a push failure must not fail the webhook, the sender or a job.
 */
@Injectable()
export class PushService {
  private readonly log = new Logger(PushService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(PUSH_TRANSPORT) private readonly transport: PushTransport,
  ) {}

  async notifyAdmins(kind: PushKind, event: PushEvent): Promise<void> {
    try {
      const admins = await this.admins();
      const text = pushText(kind, event.vars);
      const data = { kind, ...event.data };
      for (const admin of admins) await this.notify({ admin, kind, event, text, data });
    } catch (e) {
      this.log.warn(`push ${kind}:${event.subject} failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async admins(): Promise<AdminRow[]> {
    const { data, error } = await this.db.from('profiles').select('id, push_tokens').eq('role', 'admin');
    if (error) throw new Error(error.message);
    return data;
  }

  private async notify(input: {
    admin: AdminRow;
    kind: PushKind;
    event: PushEvent;
    text: { title: string; body: string };
    data: Record<string, string>;
  }): Promise<void> {
    const { admin, kind, text } = input;
    const { data: inserted, error } = await this.db
      .from('push_notifications')
      .upsert(
        { profile_id: admin.id, kind, ...text, data: input.data, dedup_key: `${kind}:${input.event.subject}:${admin.id}` },
        { onConflict: 'dedup_key', ignoreDuplicates: true },
      )
      .select('id');
    if (error) throw new Error(error.message);
    const row = inserted[0];
    if (!row || admin.push_tokens.length === 0) return; // already pushed, or no device yet
    const tokens = admin.push_tokens;
    const outcome = readTickets(tokens, await this.transport(expoMessages(tokens, text, input.data)));
    await this.db
      .from('push_notifications')
      .update({ ticket_ids: outcome.ticketIds, error: outcome.error, sent_at: new Date().toISOString() })
      .eq('id', row.id);
    if (outcome.deadTokens.length) await this.prune(admin, outcome.deadTokens);
  }

  /** Drops tokens Expo reports as DeviceNotRegistered (the TODO in me/push-tokens.ts). */
  private async prune(admin: AdminRow, dead: readonly string[]): Promise<void> {
    const kept = dead.reduce((tokens, t) => withoutPushToken(tokens, t), admin.push_tokens);
    await this.db.from('profiles').update({ push_tokens: kept }).eq('id', admin.id);
  }
}
