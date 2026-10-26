// «كل المحادثات» (HUB, then BOOK: the same phones) folded into one entry per phone. The CRM is the
// primary lead source; these rows fill gaps: phones the CRM lacks, and the status, source and
// summary the CRM never had. Pure.
import type { Enums } from '@ab/db';
import type { SourceBundle } from '../../entities/contract.ts';
import { leadSource, sheetLeadStatus } from '../../sources/values.ts';
import type { RowIssue, SourceRef, SourceRow } from '../../types.ts';
import { type PhoneInfo, toE164 } from './phone.ts';

const CONVERSATION_SPECS = ['hub_conversations', 'book_conversations'] as const;

export interface SheetLead {
  ref: SourceRef;
  phone: PhoneInfo;
  name: string | null;
  /** 'job_applicant' = «توظيف / عرض خدمة» (job_applicants import, never a lead). */
  status: Enums<'lead_status'> | 'job_applicant' | undefined;
  source: Enums<'lead_source'> | undefined;
  summary: string | null;
  agreedSlot: string | null;
  /** Local 'YYYY-MM-DD' of the first contact. */
  date: string | null;
}

export interface SheetLeads {
  byPhone: Map<string, SheetLead>;
  issues: RowIssue[];
}

const str = (row: SourceRow, field: string): string | null => {
  const v = row.fields[field];
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

const issue = (o: Omit<RowIssue, 'entity'>): RowIssue => ({ entity: 'leads', ...o });

/** First non-empty value wins (HUB before BOOK). */
function fold(prev: SheetLead, next: SheetLead): SheetLead {
  return {
    ref: prev.ref,
    phone: prev.phone,
    name: prev.name ?? next.name,
    status: prev.status ?? next.status,
    source: prev.source ?? next.source,
    summary: prev.summary ?? next.summary,
    agreedSlot: prev.agreedSlot ?? next.agreedSlot,
    date: prev.date ?? next.date,
  };
}

function readRow(row: SourceRow, issues: RowIssue[]): SheetLead | undefined {
  const statusText = str(row, 'status');
  const status = sheetLeadStatus(statusText);
  const sourceText = str(row, 'source');
  const source = leadSource(sourceText);
  if (status === 'skip' || source === 'skip') return undefined; // جروب حلقة, داخلي
  const phone = toE164(str(row, 'phone'));
  if (!phone) {
    // A job row without a usable phone is the job_applicants import's to report.
    if (status !== 'job_applicant')
      issues.push(issue({ code: 'bad_phone', severity: 'reject', ref: row.ref, field: 'phone' }));
    return undefined;
  }
  if (statusText && !status)
    issues.push(issue({ code: 'unmapped_value', severity: 'warn', ref: row.ref, field: 'status' }));
  return {
    ref: row.ref,
    phone,
    name: str(row, 'name'),
    status,
    source,
    summary: str(row, 'summary'),
    agreedSlot: str(row, 'agreed_slot'),
    date: localDate(str(row, 'date')),
  };
}

/** 'YYYY-MM-DD' part of a zone-less sheet date, or null. */
function localDate(raw: string | null): string | null {
  const d = raw?.slice(0, 10);
  return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

export function sheetLeads(bundle: Pick<SourceBundle, 'sheets'>): SheetLeads {
  const byPhone = new Map<string, SheetLead>();
  const issues: RowIssue[] = [];
  for (const spec of CONVERSATION_SPECS) {
    for (const row of bundle.sheets[spec] ?? []) {
      const lead = readRow(row, issues);
      if (!lead) continue;
      const prev = byPhone.get(lead.phone.e164);
      byPhone.set(lead.phone.e164, prev ? fold(prev, lead) : lead);
    }
  }
  return { byPhone, issues };
}
