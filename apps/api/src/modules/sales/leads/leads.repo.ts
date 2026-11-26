import type { Tables, TablesInsert, TablesUpdate } from '@ab/db';
import { NO_ASSIGNEE, type LeadSortKey } from '@ab/shared';
import type { LeadSource, LeadStatus } from '@ab/catalog';
import type { ListSort } from '@ab/core';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import type { SortSpec } from '@/common/db/list-sort';
import { readPage } from '@/common/db/page';
import { guardianSearchFilter } from '@/modules/people/guardians/guardians.mapper';
import { OwnNumbers } from '@/modules/messaging/numbers';
import { throwIfDbError, type PageQuery } from './http';

export type LeadRow = Tables<'leads'>;

export type LeadListFilter = PageQuery &
  ListSort<LeadSortKey> & {
    status?: LeadStatus | undefined;
    source?: LeadSource | undefined;
    /** A salesperson's profile id, or `none` (nobody yet). */
    assignee?: string | undefined;
  };

/** Inbox order: latest inbound first (matches leads_status_idx), unless a sort is requested. */
const LEAD_SORT: SortSpec<LeadSortKey> = {
  columns: {
    last_inbound: { column: 'last_inbound_at', nullsFirst: false },
    created_at: { column: 'created_at' },
    name: { column: 'name', nullsFirst: false },
    status: { column: 'status' },
    source: { column: 'source' },
  },
  fallback: [
    { column: 'last_inbound_at', ascending: false, nullsFirst: false },
    { column: 'created_at', ascending: false },
  ],
};

interface StatusMove {
  id: string;
  from: LeadStatus;
  to: LeadStatus;
}

/** Thin supabase-js access for `leads`; business rules live in LeadsService. */
@Injectable()
export class LeadsRepo {
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

  async list(f: LeadListFilter): Promise<{ items: LeadRow[]; total: number }> {
    const own = await this.ownNotIn();
    // A phone in any format («0552147730», «+966 55 214 7730») → its E.164 digits; else the name.
    const search = f.q ? guardianSearchFilter(f.q) : null;
    const read = () => {
      let query = this.listable(own);
      if (f.status) query = query.eq('status', f.status);
      if (f.source) query = query.eq('source', f.source);
      if (f.assignee === NO_ASSIGNEE) query = query.is('assigned_to', null);
      else if (f.assignee) query = query.eq('assigned_to', f.assignee);
      return search ? query.or(search) : query;
    };
    const { rows, total } = await readPage(read, f, LEAD_SORT);
    return { items: rows, total };
  }

  private async ownNotIn(): Promise<string | null> {
    return this.own ? this.own.notIn() : null;
  }

  /** Every lead but our own numbers' (`own`: OwnNumbers.notIn; kept, never listed or counted). */
  private listable(own: string | null) {
    const query = this.db.from('leads').select('*', { count: 'exact' });
    return own ? query.not('phone_e164', 'in', own) : query;
  }
}
