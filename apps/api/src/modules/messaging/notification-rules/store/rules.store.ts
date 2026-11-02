import type { NotificationRuleRow } from '@ab/shared';
import { Injectable, Optional } from '@nestjs/common';
import { SharedCache } from '@/common/infra/cache/shared-cache';
import { RulesReader, type RulesSnapshot } from './rules.reader';
import { RulesSourceSettings } from '@/modules/messaging/notification-rules/rules-source.settings';
import { RulesTable } from './rules.table';

/**
 * The DB RulesReader (docs/23b): one snapshot = comms_source (exactly 'module', else legacy), every
 * notification_rules row and the 8 legacy keys, cached for SETTINGS_CACHE_MS (0 in e2e). A failed
 * read is never cached; invalidate() drops the snapshot after our own writes and the source flip.
 * With Redis a rule write here (changed()) and any settings write in another process drop it too.
 */
@Injectable()
export class DbRulesReader extends RulesReader {
  private cached: { at: number; value: Promise<RulesSnapshot> } | null = null;

  constructor(
    private readonly table: RulesTable,
    private readonly settings: RulesSourceSettings,
    @Optional() private readonly shared?: SharedCache,
  ) {
    super();
    shared?.on('rules', () => this.invalidate());
    shared?.on('settings', () => this.invalidate());
  }

  snapshot(now = Date.now()): Promise<RulesSnapshot> {
    if (!this.cached || now - this.cached.at >= this.settings.ttlMs) {
      const value = this.load();
      this.cached = { at: now, value };
      value.catch(() => {
        if (this.cached?.value === value) this.cached = null;
      });
    }
    return this.cached.value;
  }

  /** The next snapshot() reads the database again. */
  invalidate(): void {
    this.cached = null;
  }

  /** After a notification_rules write here: drop it and tell the other API copies and the worker. */
  changed(): void {
    this.invalidate();
    void this.shared?.invalidate({ topic: 'rules' });
  }

  /** A fresh snapshot (writes and parity never decide on a cached one): the settings it reads too. */
  fresh(): Promise<RulesSnapshot> {
    this.settings.invalidate();
    this.invalidate();
    return this.snapshot();
  }

  private async load(): Promise<RulesSnapshot> {
    const [values, rows] = await Promise.all([this.settings.read(), this.table.rows()]);
    const { comms_source: source, ...settings } = values;
    return {
      mode: source === 'module' ? 'module' : 'legacy',
      rows: new Map<string, NotificationRuleRow>(rows.map((r) => [r.key, r])),
      settings,
    };
  }
}
