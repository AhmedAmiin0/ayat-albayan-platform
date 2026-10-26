import type { Db } from '../../db/db.module';
import { expoMessages, readTickets, type ExpoMessage, type ExpoTicket, type PushText } from './expo-push';

/** Sends a batch to Expo and returns one ticket per message (injectable for tests). */
export type PushTransport = (messages: ExpoMessage[]) => Promise<ExpoTicket[]>;

export interface ExpoDelivery {
  db: Db;
  transport: PushTransport;
  profile: { id: string; push_tokens: string[] };
  /** The push_notifications row just written for this profile. */
  rowId: string;
  text: PushText;
  data: Record<string, string>;
}

/**
 * The app half of one notification (R-MOB-01): push to the profile's devices, record the tickets on
 * the row, and drop the tokens Expo reports DeviceNotRegistered (and their session bindings). No device = nothing to do.
 */
export async function expoDeliver(d: ExpoDelivery): Promise<void> {
  const tokens = d.profile.push_tokens;
  if (tokens.length === 0) return;
  const outcome = readTickets(tokens, await d.transport(expoMessages(tokens, d.text, d.data)));
  await d.db
    .from('push_notifications')
    .update({ ticket_ids: outcome.ticketIds, error: outcome.error, sent_at: new Date().toISOString() })
    .eq('id', d.rowId);
  if (outcome.deadTokens.length === 0) return;
  // Only the dead bindings: their release trigger takes each token off the profile (array_remove).
  // d.profile.push_tokens is the live-filtered list, so writing it back would drop live tokens too.
  await d.db.from('push_device_sessions').delete().in('token', outcome.deadTokens);
}
