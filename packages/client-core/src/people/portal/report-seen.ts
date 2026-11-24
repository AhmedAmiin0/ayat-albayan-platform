import { z } from 'zod';

// New-report marks are kept on the device (docs/50 §6); rules and shape live here.

/** The device key the apps store the opened report ids under. */
export const SEEN_REPORTS_KEY = 'ab.portal.seen-reports';
/** The newest ids kept: an old device never grows without bound. */
const SEEN_MAX = 500;

const seenSchema = z.array(z.string()).catch([]);

const decodeJson: (text: string) => unknown = JSON.parse;

const json = (raw: string): unknown => {
  try {
    return decodeJson(raw);
  } catch {
    return [];
  }
};

/** The stored value (JSON text, or nothing) → the ids; anything unreadable is nothing seen. */
export const parseSeen = (raw: string | null): string[] => seenSchema.parse(json(raw ?? '[]'));

/** The ids with `id` added (once, newest last), trimmed to the newest SEEN_MAX. */
export const withSeen = (seen: readonly string[], id: string): string[] =>
  [...seen.filter((x) => x !== id), id].slice(-SEEN_MAX);

/** A sent report not opened on this device yet. */
export const isNewReport = (id: string, seen: readonly string[]): boolean => !seen.includes(id);

/** How many of these reports are new (the home card's badge). */
export const newReportCount = (
  reports: readonly { id: string }[],
  seen: readonly string[],
): number =>
  reports.filter((r) => isNewReport(r.id, seen)).length;
