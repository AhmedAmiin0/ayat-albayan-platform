import type { TablesUpdate } from '@ab/db';
import type { JobApplicantCreateBody, JobApplicantView } from '@ab/shared';
import type { Page } from '@ab/core';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { canTransitionApplicant, type ApplicantStatus } from './applicant-state-machine';
import {
  JobApplicantsRepo,
  type ApplicantListFilter,
  type JobApplicantRow,
} from './job-applicants.repo';
import { toJobApplicantView } from './job-applicants.mapper';

interface ApplicantAction {
  id: string;
  actorId: string | null;
}

interface ApplicantMoveInput extends ApplicantAction {
  to: ApplicantStatus;
}

type ApplicantPatch = Omit<TablesUpdate<'job_applicants'>, 'status' | 'from_lead_id'>;

/** Job applicants: separate from leads, never in the sales funnel (R-LEAD-04). */
@Injectable()
export class JobApplicantsService {
  constructor(
    private readonly applicants: JobApplicantsRepo,
    private readonly audit: AuditService,
  ) {}

  async list(f: ApplicantListFilter): Promise<Page<JobApplicantView>> {
    const { items, total } = await this.applicants.list(f);
    return { items: items.map(toJobApplicantView), total, page: f.page, pageSize: f.pageSize };
  }

  async get(id: string): Promise<JobApplicantView> {
    return toJobApplicantView(await this.row(id));
  }

  /** New applicants always start at 'new'; a duplicate phone is a 409. */
  async create(input: JobApplicantCreateBody, actorId: string | null): Promise<JobApplicantView> {
    return toJobApplicantView(await this.applicants.insert({ ...input, created_by: actorId }));
  }

  async update(id: string, patch: ApplicantPatch): Promise<JobApplicantView> {
    const row = await this.applicants.update(id, patch);
    if (!row) throw new NotFoundException();
    return toJobApplicantView(row);
  }

  /** Status only moves through the applicant state machine; audited (R-NFR-03). */
  async changeStatus({ id, actorId, to }: ApplicantMoveInput): Promise<JobApplicantView> {
    const row = await this.row(id);
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
    return toJobApplicantView(moved);
  }

  async remove({ id, actorId }: ApplicantAction): Promise<void> {
    const row = await this.row(id);
    await this.audit.record({
      actorId,
      entity: 'job_applicants',
      entityId: id,
      action: 'delete',
      before: row,
    });
    await this.applicants.remove(id);
  }

  private async row(id: string): Promise<JobApplicantRow> {
    const row = await this.applicants.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }
}
