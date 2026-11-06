/**
 * A read that has not settled by now counts as no answer (owner 2026-11-05: a chat read stuck
 * across a background/resume pinned the chats list and the open chat to the saved copy, with no
 * error). The deadline covers the whole request, the access token included.
 */
export const READ_TIMEOUT_MS = 20_000;

/**
 * Reads the API answers slowly by design: a chat file (signed, `?download=1` too) or a PDF page,
 * which the API may first fetch from Meta or the CRM, then render (the renderer alone allows 45 s),
 * and a booking/invoice file (`/media/:messageId`), downloaded from WhatsApp on its first ask.
 */
export const SLOW_READ_TIMEOUT_MS = 120_000;
const SLOW_READS = [
  /^\/threads\/[^/?]+\/messages\/[^/?]+\/(file|pdf\/\d+)(\?|$)/,
  /^\/threads\/[^/?]+\/media\/[^/?]+(\?|$)/,
];

/**
 * A write with no answer by now ends as no answer (docs/43 AU10): a hung POST kept the chat's send
 * in flight forever, and every poll answer was dropped behind it. Retrying is safe: every send
 * carries a clientRequestId the server dedups.
 */
export const SEND_TIMEOUT_MS = 30_000;

/**
 * The slow deadline: writes that wait for a sender pass (Outbox.send: up to 30 s + 5 s), a chat
 * file (ffmpeg and a Storage check: a retry with its id fails on the existing object), and admin
 * writes that call Meta or Google or walk every row. Cutting them at 30 s would report a send that
 * is still going, and a retry could send twice (the join link's dedup bucket is 5 minutes).
 */
export const SLOW_SEND_TIMEOUT_MS = 120_000;
const SLOW_SENDS = [
  /^\/lessons\/[^/]+\/(join-link|feedback-request)$/,
  /^\/threads\/[^/]+\/(file|messages\/[^/]+\/reaction)$/,
  /^\/calls\/permission\/[^/]+\/request$/,
  /^\/messaging\/templates(\/[^/]+\/submit)?$/,
  /^\/admin\/google\/(reconcile|discover|drive|items\/[^/]+\/retry)$/,
  /^\/admin\/google\/teachers\/[^/]+\/calendar-owner$/,
  /^\/admin\/numbers(\/import|\/[^/]+\/templates\/sync)?$/,
  /^\/payouts\/[^/]+\/generate$/,
  /^\/(leads\/assign-unassigned|schedule-rules\/refresh)$/,
];

const within = (slow: RegExp[], path: string): boolean => slow.some((re) => re.test(path));

/** The deadline for a read of this API path. */
export const readTimeoutFor = (path: string): number =>
  within(SLOW_READS, path) ? SLOW_READ_TIMEOUT_MS : READ_TIMEOUT_MS;

/** The deadline for a write (POST, PUT, PATCH, DELETE) to this API path. */
export const sendTimeoutFor = (path: string): number =>
  within(SLOW_SENDS, path) ? SLOW_SEND_TIMEOUT_MS : SEND_TIMEOUT_MS;

const READS = new Set(['GET', 'HEAD']);

/** GET or HEAD (fetch's default): the only requests apiFetch puts a read deadline on. */
export const isRead = (init: RequestInit = {}): boolean =>
  READS.has((init.method ?? 'GET').toUpperCase());
