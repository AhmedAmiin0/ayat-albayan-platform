// Expo push receipts (R-MOB-01): ~15 min after a send, Expo tells per ticket whether FCM / APNs
// took the notification. DeviceNotRegistered there means the app is gone from that device.
// Pure parts; the job does the I/O.

import { z } from 'zod';

/** A receipt Expo sent in a shape we do not know: an error naming no token (nothing is pruned). */
const UNREADABLE = { status: 'error', message: 'unreadable receipt' } as const;

/** One receipt of POST /--/api/v2/push/getReceipts (`data[ticketId]`). */
const receiptSchema = z
  .discriminatedUnion('status', [
    z.looseObject({ status: z.literal('ok') }),
    z.looseObject({
      status: z.literal('error'),
      message: z.string().optional(),
      details: z
        .looseObject({ error: z.string().optional(), expoPushToken: z.string().optional() })
        .optional(),
    }),
  ])
  .catch(UNREADABLE);

export type ExpoReceipt = z.infer<typeof receiptSchema>;

/** getReceipts' body: receipts by ticket id; ids without a receipt yet are absent. */
export const receiptsSchema = z
  .looseObject({ data: z.record(z.string(), receiptSchema).optional() })
  .transform((body) => body.data ?? {});

/** Unanchored version of @ab/shared pushTokenSchema. */
const TOKEN = /Expo(?:nent)?PushToken\[[\w-]+\]/;

/**
 * The token a DeviceNotRegistered receipt is about: the one its ticket was sent to (`sentTo`, from
 * the row's ticket_tokens), else details.expoPushToken, else the «ExponentPushToken[…]» Expo quotes
 * in the message; null for any other receipt or when none is known. An FCM receipt («The recipient
 * device is not registered with FCM.») names no token: only `sentTo` finds it.
 */
export function deadToken(receipt: ExpoReceipt, sentTo?: string): string | null {
  if (receipt.status !== 'error' || receipt.details?.error !== 'DeviceNotRegistered') return null;
  const named = receipt.details.expoPushToken ?? TOKEN.exec(receipt.message ?? '')?.[0];
  return sentTo ?? named ?? null;
}

interface ReceiptOutcome {
  /** Tickets Expo has no receipt for yet: checked again next run (receipts live 24 h). */
  pending: string[];
  /** The ticket → token map of the pending tickets only: the row keeps what it still needs. */
  pendingTokens: Record<string, string>;
  /** Tokens whose session bindings to delete. */
  deadTokens: string[];
  /** The first receipt error, or null. */
  error: string | null;
}

const only = (sentTo: Readonly<Record<string, string>>, ids: readonly string[]) =>
  Object.fromEntries(Object.entries(sentTo).filter(([id]) => ids.includes(id)));

/**
 * One push_notifications row's tickets against the receipts Expo returned. `sentTo`: the row's
 * ticket_tokens ({} on rows sent before it existed: only a receipt naming its token prunes).
 */
export function readReceipts(
  ticketIds: readonly string[],
  receipts: Readonly<Record<string, ExpoReceipt | undefined>>,
  sentTo: Readonly<Record<string, string>>,
): ReceiptOutcome {
  const outcome: ReceiptOutcome = { pending: [], pendingTokens: {}, deadTokens: [], error: null };
  for (const id of ticketIds) {
    const receipt = receipts[id];
    if (!receipt) {
      outcome.pending.push(id);
      continue;
    }
    if (receipt.status === 'ok') continue;
    outcome.error ??= receipt.message ?? receipt.details?.error ?? 'error';
    const token = deadToken(receipt, sentTo[id]);
    if (token && !outcome.deadTokens.includes(token)) outcome.deadTokens.push(token);
  }
  outcome.pendingTokens = only(sentTo, outcome.pending);
  return outcome;
}
