import { Injectable } from '@nestjs/common';
import { AuditService, type AuditEntry } from '../../../common/audit/audit.service';
import { kickConfigReload } from '../../../config/role/worker-kick';
import { NumbersConfig } from './config/numbers.config';
import { OwnNumbers } from './own/own-numbers';

/**
 * What follows every numbers write: an audit row (ids, labels, flags and secret NAMES only, never a
 * value), a refresh of the line config, so module mode applies a change without a restart, and a fresh
 * read of the academy's own numbers (OwnNumbers); then the worker's copy (kickConfigReload).
 */
@Injectable()
export class NumbersEffects {
  constructor(
    private readonly audit: AuditService,
    private readonly config: NumbersConfig,
    private readonly own: OwnNumbers,
  ) {}

  async after(entry: AuditEntry): Promise<void> {
    try {
      await this.audit.record(entry);
    } finally {
      this.own.forget();
      await this.config.reload();
      kickConfigReload();
    }
  }
}
