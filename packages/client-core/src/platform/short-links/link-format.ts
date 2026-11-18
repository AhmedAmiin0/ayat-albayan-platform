import type { ShortLinkRow, ShortLinkSendStatus, ShortLinkUser } from '@ab/shared';
import { fillSlots } from '../../teaching/reports/index.js';

// The words around a link in the list and the detail (boards LinkXWebList, LinkXWebDetail,
// LinkXStaffList, LinkXStaffDetail): its state chip, the WhatsApp send chips and «7 من 12».
// Keys index shortLinks.state / shortLinks.send (ar.json / en.json); tones are the apps' chip
// colours.

export type LinkTone = 'success' | 'warning' | 'neutral' | 'danger';

/** The server's status, plus «اكتمل العدد» for an active link that reached its limit. */
export type LinkState = 'active' | 'full' | 'expired' | 'revoked';

export interface LinkLook<K extends string> {
  key: K;
  tone: LinkTone;
}

type Usage = Pick<ShortLinkRow, 'status' | 'maxUsers' | 'visitors'>;

const STATE_TONE: Readonly<Record<LinkState, LinkTone>> = {
  active: 'success',
  full: 'warning',
  expired: 'neutral',
  revoked: 'danger',
};

/** Has the link as many distinct visitors as it allows? */
export const isFull = (row: Pick<ShortLinkRow, 'maxUsers' | 'visitors'>): boolean =>
  row.maxUsers !== null && row.visitors >= row.maxUsers;

export function linkState(row: Usage): LinkState {
  return row.status === 'active' && isFull(row) ? 'full' : row.status;
}

/** shortLinks.state.<key> and its chip tone. */
export function linkStateLook(row: Usage): LinkLook<LinkState> {
  const key = linkState(row);
  return { key, tone: STATE_TONE[key] };
}

const SEND_TONE: Readonly<Record<ShortLinkSendStatus, LinkTone>> = {
  queued: 'success',
  failed: 'danger',
  not_sent: 'neutral',
};

/** shortLinks.send.<key> («أُرسل», «فشل», «لم يُرسل بعد») and its tone. */
export const sendLook = (status: ShortLinkSendStatus): LinkLook<ShortLinkSendStatus> => ({
  key: status,
  tone: SEND_TONE[status],
});

export type SendCounts = Readonly<Record<ShortLinkSendStatus, number>>;

/** «أُرسل 9 · فشل 1 · لم يُرسل 2», and the count «أعد الإرسال لمن فشل (1)» shows. */
export function sendCounts(users: readonly Pick<ShortLinkUser, 'sendStatus'>[]): SendCounts {
  const out: Record<ShortLinkSendStatus, number> = { queued: 0, failed: 0, not_sent: 0 };
  for (const u of users) out[u.sendStatus] += 1;
  return out;
}

/** shortLinks.list.usedOf «{used} من {max}» and shortLinks.list.usedUnlimited «{used} · بلا حد». */
export interface UsageWords {
  usedOf: string;
  usedUnlimited: string;
}

export interface UsageParts {
  used: number;
  /** null = «بلا حد». */
  max: number | null;
  full: boolean;
}

export const usageParts = (row: Pick<ShortLinkRow, 'maxUsers' | 'visitors'>): UsageParts => ({
  used: row.visitors,
  max: row.maxUsers,
  full: isFull(row),
});

/** «7 من 12» or «23 · بلا حد». */
export function usageText(
  row: Pick<ShortLinkRow, 'maxUsers' | 'visitors'>,
  words: UsageWords,
): string {
  const { used, max } = usageParts(row);
  return max === null
    ? fillSlots(words.usedUnlimited, { used })
    : fillSlots(words.usedOf, { used, max });
}

/** «app.ayatalbayan.com/l/K7q2M9xT»: the short URL without its scheme (the cards' line). */
export const bareUrl = (url: string): string => url.replace(/^https?:\/\//, '');

/** «meet.google.com»: the host a link opens («يفتح: …»), or the text itself when not a URL. */
export function targetHost(url: string): string {
  const match = /^https?:\/\/([^/?#]+)/.exec(url);
  return match?.[1] ?? url;
}
