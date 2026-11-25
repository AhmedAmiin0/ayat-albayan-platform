import type { ShortLinkRow, ShortLinkSendStatus, ShortLinkUser } from '@ab/shared';
import type { Glyph } from '@ab/money';
import { fillSlots } from '../../teaching/reports';

// Tones are chip colours and glyphs their shapes, so state is never shown by colour alone.

export type LinkTone = 'success' | 'warning' | 'neutral' | 'danger';

/** An active link that reached its limit is shown as full. */
export type LinkState = 'active' | 'full' | 'expired' | 'revoked';

export interface LinkLook<K extends string> {
  key: K;
  tone: LinkTone;
  /** fill = running or sent, half = full, hollow = ended or waiting, struck = stopped or failed. */
  glyph: Glyph;
}

type Look = Pick<LinkLook<string>, 'tone' | 'glyph'>;

type Usage = Pick<ShortLinkRow, 'status' | 'maxUsers' | 'visitors'>;

/** Boards LinkXWebList / LinkXStaffList: expired is amber and hollow, revoked grey and struck. */
const STATE_LOOK: Readonly<Record<LinkState, Look>> = {
  active: { tone: 'success', glyph: 'fill' },
  full: { tone: 'warning', glyph: 'half' },
  expired: { tone: 'warning', glyph: 'hollow' },
  revoked: { tone: 'neutral', glyph: 'struck' },
};

/** Has the link as many distinct visitors as it allows? */
export const isFull = (row: Pick<ShortLinkRow, 'maxUsers' | 'visitors'>): boolean =>
  row.maxUsers !== null && row.visitors >= row.maxUsers;

export function linkState(row: Usage): LinkState {
  return row.status === 'active' && isFull(row) ? 'full' : row.status;
}

/** shortLinks.state.<key> and its chip tone and glyph. */
export function linkStateLook(row: Usage): LinkLook<LinkState> {
  const key = linkState(row);
  return { key, ...STATE_LOOK[key] };
}

const SEND_LOOK: Readonly<Record<ShortLinkSendStatus, Look>> = {
  queued: { tone: 'success', glyph: 'fill' },
  failed: { tone: 'danger', glyph: 'struck' },
  not_sent: { tone: 'neutral', glyph: 'hollow' },
};

export const sendLook = (status: ShortLinkSendStatus): LinkLook<ShortLinkSendStatus> => ({
  key: status,
  ...SEND_LOOK[status],
});

export type SendCounts = Readonly<Record<ShortLinkSendStatus, number>>;

export function sendCounts(users: readonly Pick<ShortLinkUser, 'sendStatus'>[]): SendCounts {
  const out: Record<ShortLinkSendStatus, number> = { queued: 0, failed: 0, not_sent: 0 };
  for (const u of users) out[u.sendStatus] += 1;
  return out;
}

export interface UsageWords {
  usedOf: string;
  usedUnlimited: string;
}

export interface UsageParts {
  used: number;
  /** Null means no limit. */
  max: number | null;
  full: boolean;
}

export const usageParts = (row: Pick<ShortLinkRow, 'maxUsers' | 'visitors'>): UsageParts => ({
  used: row.visitors,
  max: row.maxUsers,
  full: isFull(row),
});

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

/** Returns the host a link opens, or the text itself when it is not a URL. */
export function targetHost(url: string): string {
  const match = /^https?:\/\/([^/?#]+)/.exec(url);
  return match?.[1] ?? url;
}
