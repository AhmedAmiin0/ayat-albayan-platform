import type { TablesInsert } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';
import type { TermsRow } from './terms.mapper';

/** assistant_terms (one row per assistant) and the people those terms are for (service role; the controllers guard). */
@Injectable()
export class TermsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Every assistant (base role sales), by name. */
  async assistants(): Promise<{ id: string; full_name: string }[]> {
    const { data, error } = await this.db.from('profiles').select('id, full_name').eq('role', 'sales');
    if (error) throw dbError(error);
    return data.sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar') || a.id.localeCompare(b.id));
  }

  /** null when the student does not exist. */
  async broughtBy(studentId: string): Promise<{ brought_by: string | null; brought_at: string | null; name: string | null } | null> {
    const { data, error } = await this.db.from('students').select('brought_by, brought_at').eq('id', studentId).maybeSingle();
    if (error) throw dbError(error);
    if (!data) return null;
    if (!data.brought_by) return { ...data, name: null };
    const person = await this.db.from('profiles').select('full_name').eq('id', data.brought_by).maybeSingle();
    if (person.error) throw dbError(person.error);
    return { ...data, name: person.data?.full_name ?? null };
  }

  async isAssistant(id: string): Promise<boolean> {
    const { data, error } = await this.db.from('profiles').select('id').eq('id', id).eq('role', 'sales').maybeSingle();
    if (error) throw dbError(error);
    return data !== null;
  }

  async all(): Promise<TermsRow[]> {
    const { data, error } = await this.db.from('assistant_terms').select('*');
    if (error) throw dbError(error);
    return data;
  }

  async get(assistantId: string): Promise<TermsRow | null> {
    const { data, error } = await this.db.from('assistant_terms').select('*').eq('assistant_id', assistantId).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async upsert(row: TablesInsert<'assistant_terms'>): Promise<TermsRow> {
    const { data, error } = await this.db.from('assistant_terms').upsert(row, { onConflict: 'assistant_id' }).select('*').single();
    if (error) throw dbError(error);
    return data;
  }

  /**
   * One subscription id per student this assistant brought that has no commission row yet: what the
   * commission rule is run on when terms are set (it only runs on payment and price changes otherwise).
   */
  async uncommissioned(assistantId: string): Promise<string[]> {
    const students = await this.db.from('students').select('id').eq('brought_by', assistantId);
    if (students.error) throw dbError(students.error);
    const ids = students.data.map((s) => s.id);
    if (ids.length === 0) return [];
    const [commissions, subs] = await Promise.all([
      this.db.from('assistant_commissions').select('student_id').in('student_id', ids),
      this.db.from('subscriptions').select('id, student_id').in('student_id', ids).order('created_at'),
    ]);
    if (commissions.error) throw dbError(commissions.error);
    if (subs.error) throw dbError(subs.error);
    const done = new Set(commissions.data.map((c) => c.student_id));
    const first = new Map<string, string>();
    for (const s of subs.data) if (!done.has(s.student_id) && !first.has(s.student_id)) first.set(s.student_id, s.id);
    return [...first.values()];
  }
}
