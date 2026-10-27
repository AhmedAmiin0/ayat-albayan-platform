import type { Tables, TablesInsert, TablesUpdate } from '@ab/db';
import { NO_ASSIGNEE, type LeadSortKey, type LeadSource, type LeadStatus, type ListSort } from '@ab/shared';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { applySort, type SortSpec } from '../../../common/list-sort';
import { guardianSearchFilter } from '../../people/guardians/guardians.mapper';
import { OwnNumbers } from '../../messaging/numbers';
import { pageRange, throwIfDbError, type PageQuery } from './http';

export type LeadRow = Tables<'leads'>;

export type LeadListFilter = PageQuery &
  ListSort<LeadSortKey> & {
    status?: LeadStatus | undefined;
    source?: LeadSource | undefined;
    /** A salesperson's profile id, or `none` (nobody yet). */
    assignee?: string | undefined;
  };

/** A requested sort (R-NFR-08), newest first as the tiebreaker. */
const LEAD_SORT: SortSpec<LeadSortKey> = {
  columns: {
    last_inbound: { column: 'last_inbound_at', nullsFirst: false },
    created_at: { column: 'created_at' },
    name: { column: 'name', nullsFirst: false },
    status: { column: 'status' },
    source: { column: 'source' },
  },
  fallback: { column: 'created_at', ascending: false },
};

interface StatusMove {
  id: string;
  from: LeadStatus;
  to: LeadStatus;
}

/** Thin supabase-js access for `leads`; business rules live in LeadsService. */
@Injectable()
export class LeadsQueries {
  constructor(
    @Inject(DB) private readonly db: Db,
    /** The academy's own numbers: their lead (made before 2026-10-27) is kept but never listed or counted. */
    @Optional() private readonly own?: OwnNumbers,
  ) {}

  async findById(id: string): Promise<LeadRow | null> {
    const { data, error } = await this.db.from('leads').select('*').eq('id', id).maybeSingle();
    throwIfDbError(error);
    return data;
  }

  async findByPhone(phone: string): Promise<LeadRow | null> {
    const { data, error } = await this.db
      .from('leads')
      .select('*')
      .eq('phone_e164', phone)
      .maybeSingle();
    throwIfDbError(error);
    return data;
  }

  async insert(row: TablesInsert<'leads'>): Promise<LeadRow> {
    const { data, error } = await this.db.from('leads').insert(row).select('*').single();
    throwIfDbError(error);
    return data;
  }

  async update(id: string, patch: TablesUpdate<'leads'>): Promise<LeadRow> {
    const { data, error } = await this.db
      .from('leads')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    throwIfDbError(error);
    return data;
  }

  /** Compare-and-set on status so a concurrent change cannot bypass the state machine. */
  async moveStatus({ id, from, to }: StatusMove): Promise<LeadRow | null> {
    const { data, error } = await this.db
      .from('leads')
      .update({ status: to })
      .eq('id', id)
      .eq('status', from)
      .select('*')
      .maybeSingle();
    throwIfDbError(error);
    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('leads').delete().eq('id', id);
    throwIfDbError(error);
  }

  /** Inbox order: latest inbound first (matches leads_status_idx), unless a sort is requested. */
  async list(f: LeadListFilter): Promise<{ items: LeadRow[]; total: number }> {
    let query = this.db.from('leads').select('*', { count: 'exact' });
    const own = this.own ? await this.own.notIn() : null;
    if (own) query = query.not('phone_e164', 'in', own);
    if (f.status) query = query.eq('status', f.status);
    if (f.source) query = query.eq('source', f.source);
    if (f.assignee === NO_ASSIGNEE) query = query.is('assigned_to', null);
    else if (f.assignee) query = query.eq('assigned_to', f.assignee);
    // A phone in any format («0552147730», «+966 55 214 7730») → its E.164 digits; else the name.
    const search = f.q ? guardianSearchFilter(f.q) : null;
    if (search) query = query.or(search);
    const ordered = f.sort
      ? applySort(query, f, LEAD_SORT)
      : query.order('last_inbound_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
    const { data, error, count } = await ordered.range(...pageRange(f));
    throwIfDbError(error);
    return { items: data ?? [], total: count ?? 0 };
  }
}
