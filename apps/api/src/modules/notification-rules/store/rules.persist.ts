import type { RuleSettings } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { RulesSnapshot } from './rules.reader';
import { RulesSourceSettings } from '../rules-source.settings';
import { DbRulesReader } from './rules.store';
import { RulesTable, type RuleRowWrite } from './rules.table';

/**
 * Where the rule writes land: the row, the mirrored legacy keys (legacy mode, the flip back) and the
 * snapshot cache, which is dropped after every write (even a failed one).
 */
@Injectable()
export class RulesPersist {
  constructor(
    private readonly table: RulesTable,
    private readonly settings: RulesSourceSettings,
    private readonly reader: DbRulesReader,
  ) {}

  /** A fresh snapshot (never the cached one): writes and parity decide on it. */
  snapshot(): Promise<RulesSnapshot> {
    return this.reader.fresh();
  }

  numberExists(id: string): Promise<boolean> {
    return this.table.numberExists(id);
  }

  /** The row first, then its legacy mirror (empty in module mode: legacy rows are frozen there). */
  async save(input: { row: RuleRowWrite; legacy: Partial<RuleSettings>; actorId: string }): Promise<void> {
    try {
      await this.table.upsert(input.row, input.actorId);
      await this.settings.writeLegacy(input.legacy, input.actorId);
    } finally {
      this.reader.invalidate();
    }
  }

  async writeLegacy(values: Partial<RuleSettings>, actorId: string): Promise<void> {
    try {
      await this.settings.writeLegacy(values, actorId);
    } finally {
      this.reader.invalidate();
    }
  }

  invalidate(): void {
    this.reader.invalidate();
  }
}
