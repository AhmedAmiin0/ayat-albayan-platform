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

/** A 5xx with no provider code: the provider itself is down and sent nothing. */
export const serverDown = (status: number, code: number | null): Pick<Info, 'lineDown'> =>
  code === null && status >= 500 ? { lineDown: true } : {};
