import type { Tables, TablesInsert, TablesUpdate } from '@ab/db';
import type { LeadSource, LeadStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { pageRange, throwIfDbError, type PageQuery } from './http';

export type LeadRow = Tables<'leads'>;

export interface LeadListFilter extends PageQuery {
  status?: LeadStatus;
  source?: LeadSource;
}

export interface StatusMove {
  id: string;
  from: LeadStatus;
  to: LeadStatus;
}

/** Thin supabase-js access for `leads`; business rules live in LeadsService. */
@Injectable()
export class LeadsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

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

  /** Inbox order: latest inbound first (matches leads_status_idx). */
  async list(f: LeadListFilter): Promise<{ items: LeadRow[]; total: number }> {
    let query = this.db.from('leads').select('*', { count: 'exact' });
    if (f.status) query = query.eq('status', f.status);
    if (f.source) query = query.eq('source', f.source);
    if (f.q) query = query.or(`name.ilike.*${f.q}*,phone_e164.ilike.*${f.q}*`);
    const { data, error, count } = await query
      .order('last_inbound_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(...pageRange(f));
    throwIfDbError(error);
    return { items: data ?? [], total: count ?? 0 };
  }
}
