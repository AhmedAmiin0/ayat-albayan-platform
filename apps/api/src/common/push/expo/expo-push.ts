import type { PushKind } from '@ab/shared';
import { ar } from '@/common/infra/i18n/server-text';
import { fill } from '@/modules/reporting/report-pdf/render/pdf-text';

// Expo push API shapes and the pure parts of sending (R-MOB-01).

/** Under EXPO_API_BASE («https://exp.host»). */
export const EXPO_PUSH_PATH = '/--/api/v2/push/send';
/** = apps/mobile/src/push/registerPush.ts ANDROID_CHANNEL, created before permission is asked. */
const ANDROID_CHANNEL = 'default';

export interface PushText {
  title: string;
  body: string;
}

/** ar.json notifications.<kind> with its {slots} filled; a missing slot stays visible. */
export function pushText(kind: PushKind, vars: Record<string, string | number>): PushText {
  const t = ar.notifications[kind];
  return { title: fill(t.title, vars), body: fill(t.body, vars) };
}

export interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, string>;
  sound: 'default';
  channelId: string;
}

export function expoMessages(tokens: readonly string[], text: PushText, data: Record<string, string>): ExpoMessage[] {
  return tokens.map((to) => ({ to, ...text, data, sound: 'default', channelId: ANDROID_CHANNEL }));
}

/** One Expo push ticket (response `data[i]` for message i). */
export type ExpoTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message: string; details?: { error?: string } };

interface TicketOutcome {
  ticketIds: string[];
  /** Tokens Expo says are gone (app uninstalled): drop them from the profile. */
  deadTokens: string[];
  /** First error message when no ticket was ok; null once any device took it. */
  error: string | null;
}

export function readTickets(tokens: readonly string[], tickets: readonly ExpoTicket[]): TicketOutcome {
  const ticketIds: string[] = [];
  const deadTokens: string[] = [];
  let firstError: string | null = null;
  tickets.forEach((t, i) => {
    if (t.status === 'ok') return void ticketIds.push(t.id);
    firstError ??= t.message;
    const token = tokens[i];
    if (t.details?.error === 'DeviceNotRegistered' && token) deadTokens.push(token);
  });
  return { ticketIds, deadTokens, error: ticketIds.length ? null : firstError };
}
