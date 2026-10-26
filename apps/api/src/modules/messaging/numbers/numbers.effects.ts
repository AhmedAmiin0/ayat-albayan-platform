import { Injectable } from '@nestjs/common';
import { AuditService, type AuditEntry } from '../../../common/audit/audit.service';
import { NumbersConfig } from './config/numbers.config';

/**
 * What follows every numbers write: an audit row (ids, labels, flags and secret NAMES only, never a
 * value) and a refresh of the line config, so module mode applies a change without a restart.
 */
@Injectable()
export class NumbersEffects {
  constructor(
    private readonly audit: AuditService,
    private readonly config: NumbersConfig,
  ) {}

  async after(entry: AuditEntry): Promise<void> {
    try {
      await this.audit.record(entry);
    } finally {
      await this.config.reload();
    }
  }
}
