import { normalizePhone, type LineCheckView, type LineHealthView } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { lineNumbers, loadEnv } from '../../env';

/** Meta's display number («+966 55 123 4567», sometimes without the +) as E.164, or null. */
export function displayE164(display: string | null): string | null {
  if (!display) return null;
  const digits = display.replace(/[^0-9]/g, '');
  const result = normalizePhone(`+${digits}`);
  return result.ok ? result.e164 : null;
}

/**
 * The rows worth keeping from a check: a configured line whose phone call answered with a number.
 * A failed call or an unconfigured line keeps the previous good row (docs/23a §E H2).
 */
export function healthRows(views: readonly LineCheckView[]): KeptRow[] {
  return views.flatMap((v) => {
    const e164 = v.configured ? displayE164(v.display_phone_number) : null;
    if (!e164) return [];
    const row = { line: v.line, display_phone_e164: e164, verified_name: v.verified_name?.slice(0, 200) ?? null, checked_at: v.checked_at };
    return [{ ...row, phone_number_id: v.phone_number_id }];
  });
}

/** A kept row with the phone id it checked (migration 20261023000620). */
type KeptRow = LineHealthView & { phone_number_id: string | null };

/**
 * #134 item 9: a kept row counts only while its phone id is still the line's (a swapped number, or a
 * row from before the column, shows «not checked yet» until the next check).
 */
export function currentRows(rows: readonly KeptRow[], ids: Partial<Record<LineHealthView['line'], string>>): LineHealthView[] {
  return rows.flatMap(({ phone_number_id: id, ...row }) => (id !== null && id === ids[row.line] ? [row] : []));
}

/**
 * public.wa_line_health (migration 20261022000600): the last good «افحص الخطوط» per line, so the
 * number shows without a live Meta call. Never a token or secret. A failed write never fails the check.
 */
@Injectable()
export class LineHealthStore {
  private readonly log = new Logger(LineHealthStore.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  async save(views: readonly LineCheckView[]): Promise<void> {
    const rows = healthRows(views);
    if (rows.length === 0) return;
    const { error } = await this.db.from('wa_line_health').upsert(rows, { onConflict: 'line' });
    if (error) this.log.warn(`line health not saved: ${error.message}`);
  }

  async all(): Promise<LineHealthView[]> {
    const { data, error } = await this.db
      .from('wa_line_health')
      .select('line, display_phone_e164, verified_name, checked_at, phone_number_id')
      .order('line');
    if (error) throw new Error(`line health read failed: ${error.message}`);
    return currentRows(data, lineNumbers(loadEnv()));
  }
}
