import type { Tables } from '@ab/db';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { maybe, pgError, rows } from '@/common/db/errors';
import { OwnNumbers } from '@/modules/messaging/numbers';
import type { AssignedLead } from './sales-assign.mapper';

/** Reads and writes behind the lead assignment (service role; SalesAssignService decides). */
@Injectable()
export class SalesAssignRepo {
  constructor(
    @Inject(DB) private readonly db: Db,
    /** The academy's own numbers: their old lead is never handed to a salesperson. */
    @Optional() private readonly own?: OwnNumbers,
  ) {}

  /**
   * Every active salesperson (profiles.role = 'sales', not disabled: a disabled login must not
   * receive or keep assignments).
   */
  async salespeople(): Promise<{ id: string; full_name: string }[]> {
    const data = rows(await this.db.from('profiles').select('id, full_name').eq('role', 'sales').is('disabled_at', null).order('full_name'));
    return data;
  }

  async assignedLeads(ids: readonly string[]): Promise<AssignedLead[]> {
    if (ids.length === 0) return [];
    const data = rows(await this.db.from('leads').select('assigned_to, status, updated_at').in('assigned_to', [...ids]));
    return data;
  }

  async unassignedLeadIds(): Promise<string[]> {
    const own = this.own ? await this.own.notIn() : null;
    const query = this.db.from('leads').select('id').is('assigned_to', null);
    const { data, error } = await (own ? query.not('phone_e164', 'in', own) : query).order('created_at');
    if (error) throw pgError(error);
    return data.map((l) => l.id);
  }

  async isSalesperson(profileId: string): Promise<boolean> {
    const data = maybe(await this.db.from('profiles').select('id').eq('id', profileId).eq('role', 'sales').is('disabled_at', null).maybeSingle());
    return data !== null;
  }

  /**
   * Sets (or clears) the owner; `onlyIfFree` makes it a compare-and-set that never reassigns. Null
   * when nothing matched.
   */
  async setAssignee(input: { leadId: string; profileId: string | null; onlyIfFree?: boolean }): Promise<Tables<'leads'> | null> {
    let query = this.db.from('leads').update({ assigned_to: input.profileId }).eq('id', input.leadId);
    if (input.onlyIfFree) query = query.is('assigned_to', null);
    const data = maybe(await query.select('*').maybeSingle());
    return data;
  }

  /** profile id -> full name, for the leads list. */
  async names(ids: readonly string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const data = rows(await this.db.from('profiles').select('id, full_name').in('id', [...ids]));
    return new Map(data.map((p) => [p.id, p.full_name]));
  }
}
