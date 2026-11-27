import type { Tables, TablesInsert, TablesUpdate } from '@ab/db';
import type { JobApplicantListQuery } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { readPage } from '@/common/db/page';
import { guardianSearchFilter } from '@/modules/people/guardians/guardians.mapper';
import { throwIfDbError } from '@/modules/sales/leads/http';
import type { ApplicantStatus } from './applicant-state-machine';
import { APPLICANT_SORT, applyApplicantFilters } from './job-applicants.list';

export type JobApplicantRow = Tables<'job_applicants'>;

export type ApplicantListFilter = JobApplicantListQuery;

/** Every column the applicant answer names (jobApplicantViewSchema). */
const COLUMNS =
  'id, phone_e164, name, status, cv_url, recitation_url, notes, from_lead_id, created_by, created_at, updated_at';

export interface ApplicantMove {
  id: string;
  from: JobApplicantRow['status'];
  to: ApplicantStatus;
}

/** Thin supabase-js access for `job_applicants`; rules live in JobApplicantsService. */
@Injectable()
export class JobApplicantsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async findById(id: string): Promise<JobApplicantRow | null> {
    const { data, error } = await this.db
      .from('job_applicants')
      .select(COLUMNS)
      .eq('id', id)
      .maybeSingle();
    throwIfDbError(error);
    return data;
  }

  async findByPhone(phone: string): Promise<JobApplicantRow | null> {
    const { data, error } = await this.db
      .from('job_applicants')
      .select(COLUMNS)
      .eq('phone_e164', phone)
      .maybeSingle();
    throwIfDbError(error);
    return data;
  }

  /** Always starts at the default status 'new'; 23505 (phone exists) → 409. */
  async insert(row: Omit<TablesInsert<'job_applicants'>, 'status'>): Promise<JobApplicantRow> {
    const { data, error } = await this.db
      .from('job_applicants')
      .insert(row)
      .select(COLUMNS)
      .single();
    throwIfDbError(error);
    return data;
  }

  async update(id: string, patch: Omit<TablesUpdate<'job_applicants'>, 'status'>) {
    const { data, error } = await this.db
      .from('job_applicants')
      .update(patch)
      .eq('id', id)
      .select(COLUMNS)
      .maybeSingle();
    throwIfDbError(error);
    return data;
  }

  /** Compare-and-set on status so a concurrent change cannot bypass the state machine. */
  async moveStatus({ id, from, to }: ApplicantMove): Promise<JobApplicantRow | null> {
    const { data, error } = await this.db
      .from('job_applicants')
      .update({ status: to })
      .eq('id', id)
      .eq('status', from)
      .select(COLUMNS)
      .maybeSingle();
    throwIfDbError(error);
    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('job_applicants').delete().eq('id', id);
    throwIfDbError(error);
  }

  async list(f: ApplicantListFilter): Promise<{ items: JobApplicantRow[]; total: number }> {
    const search = f.q ? guardianSearchFilter(f.q) : null;
    const read = () => {
      const all = this.db.from('job_applicants').select(COLUMNS, { count: 'exact' });
      let query = applyApplicantFilters(all, f);
      if (f.status) query = query.eq('status', f.status);
      return search ? query.or(search) : query;
    };
    const { rows, total } = await readPage(read, f, APPLICANT_SORT);
    return { items: rows, total };
  }
}
