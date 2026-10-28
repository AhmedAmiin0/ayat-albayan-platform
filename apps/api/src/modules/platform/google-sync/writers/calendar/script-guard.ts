import type { GoogleClient, GoogleListedEvent } from '../../google-client.port';
import { EVENT, PLATFORM_SOURCE } from '../../google-format';

/** «حلقة —»: the script's titles (and ours) start with it; the tag tells ours apart. */
const TITLE = EVENT.titlePrefix.trim();

const isTagged = (e: GoogleListedEvent): boolean => e.extendedProperties?.private?.['ab_source'] === PLATFORM_SOURCE;

/**
 * The old Apps Script's event for this slot (docs/24 «نقل تقويم معلم إلى المنصة»): not tagged as ours,
 * not cancelled, starting at the same instant, titled «حلقة — …» or carrying the script's sheet line.
 */
export function isScriptEvent(e: GoogleListedEvent, startsAt: string): boolean {
  if (e.status === 'cancelled' || isTagged(e)) return false;
  if (Date.parse(e.start?.dateTime ?? '') !== Date.parse(startsAt)) return false;
  return (e.summary ?? '').startsWith(TITLE) || (e.description ?? '').includes(EVENT.scriptFooter);
}

/**
 * The duplicate guard: before the platform INSERTS an event for an imported lesson, it lists that
 * calendar's events overlapping the lesson start. Read-only: the script's event is never edited or deleted.
 */
export async function scriptEventAt(google: GoogleClient, input: { calendarId: string; startsAt: string }): Promise<boolean> {
  const start = new Date(input.startsAt);
  const timeMin = start.toISOString();
  const timeMax = new Date(start.getTime() + 60_000).toISOString();
  const found = await google.listEvents({ calendarId: input.calendarId, timeMin, timeMax });
  return found.some((e) => isScriptEvent(e, input.startsAt));
}
