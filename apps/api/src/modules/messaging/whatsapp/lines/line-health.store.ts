import type { LineCheckView, LineHealthView } from '@ab/shared';
import { isWaLine } from '@ab/catalog';
import { normalizePhone } from '@ab/core';
import { Injectable, Logger } from '@nestjs/common';
import { lineNumbers, loadEnv } from '@/config/env/env';
import { LineHealthRepo } from './line-health.repo';

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
    const verified_name = v.verified_name?.slice(0, 200) ?? null;
    const row = { line: v.line, display_phone_e164: e164, verified_name, checked_at: v.checked_at };
    return [{ ...row, phone_number_id: v.phone_number_id }];
  });
}

/** A kept row with the phone id it checked (migration 20261023000620). */
type KeptRow = LineHealthView & { phone_number_id: string | null };

/**
 * #134 item 9: a kept row counts only while its phone id is still the line's (a swapped number, or
 * a row from before the column, shows «not checked yet» until the next check).
 */
export function currentRows(
  rows: readonly KeptRow[],
  ids: Partial<Record<LineHealthView['line'], string>>,
): LineHealthView[] {
  return rows.flatMap(({ phone_number_id: id, ...row }) =>
    id !== null && id === ids[row.line] ? [row] : [],
  );
}

/** The last good check per line; never a secret; write failures ignored. */
@Injectable()
export class LineHealthStore {
  private readonly log = new Logger(LineHealthStore.name);

  constructor(private readonly repo: LineHealthRepo) {}

  async save(views: readonly LineCheckView[]): Promise<void> {
    const rows = healthRows(views);
    if (rows.length === 0) return;
    const error = await this.repo.upsert(rows);
    if (error !== null) this.log.warn(`line health not saved: ${error}`);
  }

  async all(): Promise<LineHealthView[]> {
    const data = await this.repo.rows();
    return currentRows(
      data.flatMap((r) => (isWaLine(r.line) ? [{ ...r, line: r.line }] : [])),
      lineNumbers(loadEnv()),
    );
  }
}
