import type { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// What a send's transport failure says about the line (docs/12 §3.3), shared by every driver.

type Info = WaError['info'];

/**
 * reached: the provider may have the request (a dropped connection), so never resent blindly. A
 * refused or unresolvable connection never left: the line is down, not the message.
 */
export const reachInfo = (reached: boolean): Info =>
  reached
    ? { code: null, status: 0, uncertain: true }
    : { code: null, status: 0, uncertain: false, lineDown: true };

/** The deadline fired: uncertain like a dropped connection, and counted by the lane. */
export const TIMEOUT_INFO: Info = { code: null, status: 0, uncertain: true, timedOut: true };

type ServerInfo = Pick<Info, 'lineDown' | 'uncertain'>;

/**
 * A gateway's 502 / 504 (Kapso, a proxy) may come after it passed the send on, so a resend could
 * duplicate it, as the CRM rule says (docs/12 §3.3).
 */
const GATEWAY: Readonly<Record<number, ServerInfo>> = {
  502: { uncertain: true },
  504: { uncertain: true },
};

/** A 5xx with no provider code: the provider is down and sent nothing, unless a gateway's. */
export const serverDown = (status: number, code: number | null): ServerInfo =>
  code === null && status >= 500 ? (GATEWAY[status] ?? { lineDown: true }) : {};
