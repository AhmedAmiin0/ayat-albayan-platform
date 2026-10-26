import type { GoogleDiscoveryView, GoogleFound } from '@ab/shared';
import { z } from 'zod';
import type { GoogleClient } from '../google-client.port';
import { DRIVE, MIME } from '../google-format';
import type { SummaryLink } from './suggest';
import { summaryLinks } from '../writers/sheets/summary-row';

/** google_account.discovery: the view plus the summary sheet's student links (for suggestions). */
type StoredDiscovery = GoogleDiscoveryView & { students: SummaryLink[] };

const found = z.object({ id: z.string(), name: z.string() });
const stored = z.object({
  at: z.string(),
  calendars: z.array(found),
  root_folder: found.nullable(),
  summary_sheet: found.nullable(),
  students: z.array(z.object({ name: z.string(), folderId: z.string(), sheetId: z.string().nullable() })).default([]),
});

export function readDiscovery(raw: unknown): StoredDiscovery | null {
  const r = stored.safeParse(raw);
  return r.success ? r.data : null;
}

/**
 * Discovery (docs/24 §3): READ-ONLY Google calls — the calendar list, the root folder
 * «تقارير آيات البيان», the summary sheet «سجل الطلاب المشتركين» in it and its folder links.
 * Nothing found here is used until an admin confirms it.
 */
export async function discover(google: GoogleClient, now = new Date()): Promise<StoredDiscovery> {
  const calendars: GoogleFound[] = (await google.listCalendars()).filter((c) => c.id !== 'primary').map((c) => ({ id: c.id, name: c.summary }));
  const roots = await google.findFiles({ name: DRIVE.rootFolder, mimeType: MIME.folder });
  const root = roots.length === 1 && roots[0] ? { id: roots[0].id, name: roots[0].name } : null;
  const sheets = root ? await google.findFiles({ name: DRIVE.summarySheet, parentId: root.id, mimeType: MIME.sheet }) : [];
  const sheet = sheets.length === 1 && sheets[0] ? { id: sheets[0].id, name: sheets[0].name } : null;
  const rows = sheet ? await google.readValues({ spreadsheetId: sheet.id, range: 'A2:H', render: 'FORMULA' }) : [];
  return { at: now.toISOString(), calendars, root_folder: root, summary_sheet: sheet, students: summaryLinks(rows) };
}
