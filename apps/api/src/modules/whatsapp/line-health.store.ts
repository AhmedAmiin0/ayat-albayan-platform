import { normalizePhone, type LineCheckView, type LineHealthView } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';

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
export function healthRows(views: readonly LineCheckView[]): LineHealthView[] {
  return views.flatMap((v) => {
    const e164 = v.configured ? displayE164(v.display_phone_number) : null;
    if (!e164) return [];
    return [{ line: v.line, display_phone_e164: e164, verified_name: v.verified_name?.slice(0, 200) ?? null, checked_at: v.checked_at }];
  });
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
      .select('line, display_phone_e164, verified_name, checked_at')
      .order('line');
    if (error) throw new Error(`line health read failed: ${error.message}`);
    return data;
  }
}
