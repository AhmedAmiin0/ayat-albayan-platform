import { LinesCheck } from '@/modules/messaging/whatsapp/lines/lines.check';
import { CHAT_ENV, routedFetch } from '@/modules/messaging/whatsapp/whatsapp.lines.fakes';
import { STUB_ENV, type Recorded } from '@/modules/messaging/whatsapp/whatsapp.fakes';

export const N = STUB_ENV.phoneNumberId;
export const C = CHAT_ENV.phoneNumberId;
export const NW = `${STUB_ENV.wabaId}/subscribed_apps`;
export const CW = `${CHAT_ENV.wabaId}/subscribed_apps`;

/** A LinesCheck whose Graph answers come from `routes` (path → recorded reply). */
export function checker(routes: Record<string, Recorded | Error>) {
  const f = routedFetch(routes);
  const lines = new LinesCheck();
  lines.fetch = f.fetch;
  return { lines, requests: f.requests };
}
