// Job applicants from the conversation and hiring-reply tabs (C4); one per phone; pure.
import type { EntityModule, SourceBundle } from '../../entities/contract.ts';
import { keys } from '../../keys.ts';
import { phoneCell, text } from '../../sources/sheets/cells.ts';
import { accepted, issueOnly, issuesFor } from '../../sources/sheets/issues.ts';
import { testReason } from '../../sources/sheets/test-rows.ts';
import { sheetLeadStatus } from '../../sources/values.ts';
import type { Mapped, RowIssue, SourceRow } from '../../types.ts';

interface Applicant {
  ref: SourceRow['ref'];
  name: string | null;
  notes: string | null;
}

function applicantRows(bundle: SourceBundle): SourceRow[] {
  const isJob = (r: SourceRow) => sheetLeadStatus(text(r.fields.status)) === 'job_applicant';
  return [
    ...(bundle.sheets.hub_conversations ?? []).filter(isJob),
    ...(bundle.sheets.book_conversations ?? []).filter(isJob),
    ...(bundle.sheets.hub_job_replies ?? []),
  ];
}

/** The first row of a phone wins; later rows only fill its empty name and notes. */
function merged(prev: Applicant | undefined, next: Applicant): Applicant {
  if (!prev) return next;
  return { ...prev, name: prev.name ?? next.name, notes: prev.notes ?? next.notes };
}

export function mapJobApplicants(bundle: SourceBundle): Mapped[] {
  const byPhone = new Map<string, Applicant>();
  const issues: RowIssue[] = [];
  for (const r of applicantRows(bundle)) {
    const issue = issuesFor('job_applicants', r.ref);
    const name = text(r.fields.name);
    const phone = phoneCell(r.fields.phone);
    if (testReason({ names: [name], phone: phone.ok ? phone.e164 : null })) {
      issues.push(issue({ code: 'test_row', severity: 'reject' }));
      continue;
    }
    if (!phone.ok) {
      issues.push(
        issue({ code: 'bad_phone', severity: 'reject', field: 'phone', detail: phone.reason }),
      );
      continue;
    }
    byPhone.set(
      phone.e164,
      merged(byPhone.get(phone.e164), { ref: r.ref, name, notes: text(r.fields.summary) }),
    );
  }
  const ok = [...byPhone].map(([phone, a]) =>
    accepted({
      key: keys.jobApplicant(phone),
      ref: a.ref,
      columns: { phone_e164: phone, name: a.name, status: 'new', notes: a.notes },
    }),
  );
  return [...ok, ...issueOnly(issues)];
}

export const jobApplicantsModule: EntityModule = {
  entity: 'job_applicants',
  table: 'job_applicants',
  adoptBy: 'phone_e164',
  map: mapJobApplicants,
};
