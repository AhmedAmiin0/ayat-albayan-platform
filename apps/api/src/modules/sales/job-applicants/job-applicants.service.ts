import type { TablesUpdate } from '@ab/db';
import type { JobApplicantCreate } from '@ab/shared';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../../common/audit/audit.service';
import type { Page } from '../leads/http';
import { canTransitionApplicant, type ApplicantStatus } from './applicant-state-machine';
import {
  JobApplicantsQueries,
  type ApplicantListFilter,
  type JobApplicantRow,
} from './job-applicants.queries';

export interface ApplicantAction {
  id: string;
  actorId: string | null;
}

export type ApplicantInput = Omit<JobApplicantCreate, 'status' | 'from_lead_id'>;
export type ApplicantPatch = Omit<TablesUpdate<'job_applicants'>, 'status' | 'from_lead_id'>;

/** Job applicants: separate from leads, never in the sales funnel (R-LEAD-04). */
@Injectable()
export class JobApplicantsService {
  constructor(
    private readonly applicants: JobApplicantsQueries,
    private readonly audit: AuditService,
  ) {}

  async list(f: ApplicantListFilter): Promise<Page<JobApplicantRow>> {
    const { items, total } = await this.applicants.list(f);
    return { items, total, page: f.page, pageSize: f.pageSize };
  }

  async get(id: string): Promise<JobApplicantRow> {
    const row = await this.applicants.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  /** New applicants always start at 'new'; a duplicate phone is a 409. */
  create(input: ApplicantInput, actorId: string | null): Promise<JobApplicantRow> {
    return this.applicants.insert({ ...input, created_by: actorId });
  }

  async update(id: string, patch: ApplicantPatch): Promise<JobApplicantRow> {
    const row = await this.applicants.update(id, patch);
    if (!row) throw new NotFoundException();
    return row;
  }

  /** Status only moves through the applicant state machine; audited (R-NFR-03). */
  async changeStatus({ id, actorId, to }: ApplicantAction & { to: ApplicantStatus }) {
    const row = await this.get(id);
    const invalid = new ConflictException({ code: 'invalid_transition', from: row.status, to });
    if (!canTransitionApplicant(row.status, to)) throw invalid;
    const moved = await this.applicants.moveStatus({ id, from: row.status, to });
    if (!moved) throw invalid; // changed concurrently
    await this.audit.record({
      actorId,
      entity: 'job_applicants',
      entityId: id,
      action: 'status_change',
      before: { status: row.status },
      after: { status: to },
    });
    return moved;
  }

  async remove({ id, actorId }: ApplicantAction): Promise<void> {
    const row = await this.get(id);
    await this.audit.record({
      actorId,
      entity: 'job_applicants',
      entityId: id,
      action: 'delete',
      before: row,
    });
    await this.applicants.remove(id);
  }
}
