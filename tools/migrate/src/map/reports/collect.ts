// All report rows → parsed reports, with A7 duplicate submissions collapsed once here so lessons,
// lesson_students and lesson_reports stay consistent. HUB «تقارير الحلقات» is the source; REP
// «Form Responses 1» rows only count when HUB lacks their timestamp (HUB holds all 60 today). Pure.
import type { SourceBundle } from '../../entities/contract.ts';
import { text } from '../../sources/sheets/cells.ts';
import type { RowIssue, SourceRow } from '../../types.ts';
import { studentIndex } from '../people/match.ts';
import { dedupe } from './dedupe.ts';
import { type ParsedReport, parseReport } from './parse.ts';
import { bookingSlots } from './times.ts';

export interface Reports {
  reports: ParsedReport[];
  issues: RowIssue[];
}

export function reportRows(bundle: SourceBundle): SourceRow[] {
  const hub = bundle.sheets['hub_reports'] ?? [];
  const seen = new Set(hub.map((r) => text(r.fields['submitted_at'])));
  const rep = (bundle.sheets['rep_reports'] ?? []).filter(
    (r) => !seen.has(text(r.fields['submitted_at'])),
  );
  return [...hub, ...rep];
}

export function collectReports(bundle: SourceBundle): Reports {
  const ix = studentIndex(bundle.earlier.get('students'));
  const ctx = { ix, slots: bookingSlots(bundle, ix), today: bundle.today };
  const parsed: ParsedReport[] = [];
  const issues: RowIssue[] = [];
  for (const row of reportRows(bundle)) {
    const r = parseReport(row, ctx);
    if (Array.isArray(r)) issues.push(...r);
    else parsed.push(r);
  }
  const d = dedupe(parsed);
  return { reports: d.reports, issues: [...issues, ...d.issues] };
}
