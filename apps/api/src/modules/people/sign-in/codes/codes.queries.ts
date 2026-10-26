import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { dbError } from '../../../../common/http/http';
import type { CodePurpose, CodeStore, LiveCode, NewCode, PhoneStats, Subject } from '../sign-in.ports';

const DAY_MS = 24 * 3600_000;
const QUARTER_MS = 15 * 60_000;
const PURPOSES: readonly CodePurpose[] = ['sign_in', 'reset_password', 'set_password'];
const asPurpose = (p: string): CodePurpose => PURPOSES.find((x) => x === p) ?? 'sign_in';

/** CodeStore on the service-role client (migration 771: login_codes, login_code_take / _spend). */
@Injectable()
export class CodesQueries implements CodeStore {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Also drops codes older than a week (spent or dead: nothing reads them after a day). */
  async insert(row: NewCode): Promise<string> {
    const old = await this.db.from('login_codes').delete().lt('created_at', new Date(Date.now() - 7 * DAY_MS).toISOString());
    if (old.error) throw dbError(old.error);
    const { data, error } = await this.db
      .from('login_codes')
      .insert({
        purpose: row.purpose,
        subject_kind: row.subject.kind,
        subject_id: row.subject.id,
        phone_e164: row.phone,
        code_hash: row.hash,
        max_attempts: row.maxAttempts,
        expires_at: row.expiresAt.toISOString(),
      })
      .select('id')
      .single();
    if (error) throw dbError(error);
    return data.id;
  }

  async latest(subject: Subject, purposes: readonly CodePurpose[]): Promise<LiveCode | null> {
    const { data, error } = await this.db
      .from('login_codes')
      .select('id, purpose, phone_e164')
      .eq('subject_kind', subject.kind)
      .eq('subject_id', subject.id)
      .in('purpose', [...purposes])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw dbError(error);
    return data ? { id: data.id, purpose: asPurpose(data.purpose), phone: data.phone_e164 } : null;
  }

  async take(id: string): Promise<string | null> {
    const { data, error } = await this.db.rpc('login_code_take', { p_id: id });
    if (error) throw dbError(error);
    return data ?? null;
  }

  async spend(id: string): Promise<boolean> {
    const { data, error } = await this.db.rpc('login_code_spend', { p_id: id });
    if (error) throw dbError(error);
    return data === true;
  }

  async delivered(id: string, sendError: string | null): Promise<void> {
    const patch = sendError ? { send_error: sendError } : { sent_at: new Date().toISOString() };
    const { error } = await this.db.from('login_codes').update(patch).eq('id', id);
    if (error) throw dbError(error);
  }

  /** The phone's codes of the last 24 hours; a spent code's last attempt was the right one. */
  async phoneStats(phone: string, now: Date): Promise<PhoneStats> {
    const since = new Date(now.getTime() - DAY_MS).toISOString();
    const { data, error } = await this.db
      .from('login_codes')
      .select('created_at, attempts, used_at')
      .eq('phone_e164', phone)
      .gte('created_at', since);
    if (error) throw dbError(error);
    const quarter = now.getTime() - QUARTER_MS;
    return {
      sentLast15Min: data.filter((r) => new Date(r.created_at).getTime() > quarter).length,
      sentLastDay: data.length,
      failedLastDay: data.reduce((n, r) => n + r.attempts - (r.used_at ? 1 : 0), 0),
    };
  }
}
