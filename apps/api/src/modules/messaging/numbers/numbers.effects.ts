import { Inject, Injectable, Optional, type OnModuleInit } from '@nestjs/common';
import { SharedCache } from '@/common/infra/cache/shared-cache';
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
export class NumbersEffects implements OnModuleInit {
  /** With Redis: a numbers write here makes the other API copies and the worker reload too. */
  @Optional() @Inject(SharedCache) private readonly shared?: SharedCache;

  constructor(
    private readonly audit: AuditService,
    private readonly config: NumbersConfig,
    private readonly own: OwnNumbers,
  ) {}

  /** Another process changed a number, or a setting (comms_source flips the line config). */
  onModuleInit(): void {
    const reload = (): void => {
      this.own.forget();
      void this.config.reload();
    };
    this.shared?.on('numbers', reload);
    this.shared?.on('settings', reload);
  }

  async after(entry: AuditEntry): Promise<void> {
    try {
      await this.audit.record(entry);
    } finally {
      this.own.forget();
      await this.config.reload();
      kickConfigReload();
      await this.shared?.invalidate({ topic: 'numbers' });
    }
  }
}
