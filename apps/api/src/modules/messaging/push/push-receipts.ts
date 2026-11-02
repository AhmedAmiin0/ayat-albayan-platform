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

/** Unanchored version of me/push-tokens.ts pushTokenSchema. */
const TOKEN = /Expo(?:nent)?PushToken\[[\w-]+\]/;

/**
 * The token a DeviceNotRegistered receipt is about: details.expoPushToken, else the
 * «ExponentPushToken[…]» Expo quotes in the message; null for any other receipt or when the
 * receipt names no token (then nothing is pruned: the next ticket error catches it).
 */
export function deadToken(receipt: ExpoReceipt): string | null {
  if (receipt.status !== 'error' || receipt.details?.error !== 'DeviceNotRegistered') return null;
  return receipt.details.expoPushToken ?? TOKEN.exec(receipt.message ?? '')?.[0] ?? null;
}

interface ReceiptOutcome {
  /** Tickets Expo has no receipt for yet: checked again next run (receipts live 24 h). */
  pending: string[];
  /** Tokens to drop from the admin's profile. */
  deadTokens: string[];
  /** The first receipt error, or null. */
  error: string | null;
}

/** One push_notifications row's tickets against the receipts Expo returned. */
export function readReceipts(
  ticketIds: readonly string[],
  receipts: Readonly<Record<string, ExpoReceipt | undefined>>,
): ReceiptOutcome {
  const outcome: ReceiptOutcome = { pending: [], deadTokens: [], error: null };
  for (const id of ticketIds) {
    const receipt = receipts[id];
    if (!receipt) {
      outcome.pending.push(id);
      continue;
    }
    if (receipt.status === 'ok') continue;
    outcome.error ??= receipt.message ?? receipt.details?.error ?? 'error';
    const token = deadToken(receipt);
    if (token && !outcome.deadTokens.includes(token)) outcome.deadTokens.push(token);
  }
  return outcome;
}
