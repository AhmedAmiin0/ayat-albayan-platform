import type { Tables, TablesInsert, TablesUpdate } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { applySort } from '../../common/list-sort';
import { guardianSearchFilter } from '../guardians/guardians.mapper';
import { pageRange, throwIfDbError, type PageQuery } from '../leads/http';
import type { ApplicantStatus } from './applicant-state-machine';
import { APPLICANT_SORT, applyApplicantFilters, type ApplicantColumnQuery } from './job-applicants.list';

export type JobApplicantRow = Tables<'job_applicants'>;

export type ApplicantListFilter = PageQuery & ApplicantColumnQuery & { status?: ApplicantStatus | undefined };

export interface ApplicantMove {
  id: string;
  from: JobApplicantRow['status'];
  to: ApplicantStatus;
}

/** Thin supabase-js access for `job_applicants`; rules live in JobApplicantsService. */
@Injectable()
export class JobApplicantsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async findById(id: string): Promise<JobApplicantRow | null> {
    const { data, error } = await this.db
      .from('job_applicants')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwIfDbError(error);
    return data;
  }

  async findByPhone(phone: string): Promise<JobApplicantRow | null> {
    const { data, error } = await this.db
      .from('job_applicants')
      .select('*')
      .eq('phone_e164', phone)
      .maybeSingle();
    throwIfDbError(error);
    return data;
  }

  /** Always starts at the default status 'new'; 23505 (phone exists) → 409. */
  async insert(row: Omit<TablesInsert<'job_applicants'>, 'status'>): Promise<JobApplicantRow> {
    const { data, error } = await this.db.from('job_applicants').insert(row).select('*').single();
    throwIfDbError(error);
    return data;
  }

  async update(id: string, patch: Omit<TablesUpdate<'job_applicants'>, 'status'>) {
    const { data, error } = await this.db
      .from('job_applicants')
      .update(patch)
      .eq('id', id)
      .select('*')
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
      .select('*')
      .maybeSingle();
    throwIfDbError(error);
    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('job_applicants').delete().eq('id', id);
    throwIfDbError(error);
  }

  async list(f: ApplicantListFilter): Promise<{ items: JobApplicantRow[]; total: number }> {
    let query = applyApplicantFilters(this.db.from('job_applicants').select('*', { count: 'exact' }), f);
    if (f.status) query = query.eq('status', f.status);
    const search = f.q ? guardianSearchFilter(f.q) : null;
    if (search) query = query.or(search);
    const { data, error, count } = await applySort(query, f, APPLICANT_SORT).range(...pageRange(f));
    throwIfDbError(error);
    return { items: data ?? [], total: count ?? 0 };
  }
}
