import type { Json } from '@ab/db';
import { Global, Inject, Injectable, Module } from '@nestjs/common';
import { DB, type Db } from '../db/db.module';

export interface AuditEntry {
  /** auth.users id of the acting user; null for system jobs. */
  actorId: string | null;
  /** Table / aggregate name, e.g. 'students', 'leads'. */
  entity: string;
  entityId: string;
  /** Verb, e.g. 'status_change', 'merge', 'payment_recorded', 'report_edit'. */
  action: string;
  before?: Json;
  after?: Json;
}

/** Append-only audit trail (R-NFR-03). Throws if the row cannot be written. */
@Injectable()
export class AuditService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async record(entry: AuditEntry): Promise<void> {
    const { error } = await this.db.from('audit_log').insert({
      actor_id: entry.actorId,
      entity: entry.entity,
      entity_id: entry.entityId,
      action: entry.action,
      before: entry.before ?? null,
      after: entry.after ?? null,
    });
    if (error) throw new Error(`audit_log insert failed: ${error.message}`);
  }
}

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
