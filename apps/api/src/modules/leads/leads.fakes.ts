// Test fixtures for the leads + job-applicants service tests (not shipped behaviour).
import { vi } from 'vitest';
import type { AuditService } from '../../common/audit/audit.service';
import type {
  JobApplicantRow,
  JobApplicantsQueries,
} from '../job-applicants/job-applicants.queries';
import type { LeadRow, LeadsQueries } from './leads.queries';
import { LeadsService } from './leads.service';

export const LEAD_ID = '00000000-0000-4000-8000-000000000001';
export const APPLICANT_ID = '00000000-0000-4000-8000-000000000002';

export function lead(over: Partial<LeadRow> = {}): LeadRow {
  return {
    id: LEAD_ID,
    phone_e164: '+966501234567',
    name: null,
    source: 'whatsapp_direct',
    status: 'new',
    tz: null,
    qualification: {},
    assigned_to: null,
    last_inbound_at: null,
    last_outbound_at: null,
    next_follow_up_at: null,
    follow_up_paused: false,
    follow_up_stage: 0,
    converted_guardian_id: null,
    created_at: '2026-09-01T10:00:00+00:00',
    updated_at: '2026-09-01T10:00:00+00:00',
    created_by: null,
    ...over,
  };
}

export function applicant(over: Partial<JobApplicantRow> = {}): JobApplicantRow {
  return {
    id: APPLICANT_ID,
    phone_e164: '+966501234567',
    name: null,
    status: 'new',
    cv_url: null,
    recitation_url: null,
    notes: null,
    from_lead_id: null,
    created_at: '2026-09-01T10:00:00+00:00',
    updated_at: '2026-09-01T10:00:00+00:00',
    created_by: null,
    ...over,
  };
}

function fakeQueries() {
  return {
    findById: vi.fn(),
    findByPhone: vi.fn().mockResolvedValue(null),
    insert: vi.fn(),
    update: vi.fn(),
    moveStatus: vi.fn(),
    remove: vi.fn().mockResolvedValue(undefined),
    list: vi.fn(),
  };
}

export function fakeDeps() {
  const leads = fakeQueries();
  const applicants = fakeQueries();
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  return {
    leads,
    applicants,
    audit,
    asLeads: leads as unknown as LeadsQueries,
    asApplicants: applicants as unknown as JobApplicantsQueries,
    asAudit: audit as unknown as AuditService,
  };
}

export function leadsService() {
  const deps = fakeDeps();
  return { ...deps, service: new LeadsService(deps.asLeads, deps.asApplicants, deps.asAudit) };
}
