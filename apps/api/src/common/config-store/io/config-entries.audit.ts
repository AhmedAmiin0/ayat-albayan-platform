import type { Json } from '@ab/db';
import { Injectable } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { SINGLETON_ENTITY_ID } from '../../audit/singleton-entity';

interface ValueAudit {
  actorId: string;
  key: string;
  before: unknown;
  after: unknown;
}

interface DescriptionAudit {
  actorId: string;
  key: string;
  before: string | null;
  after: string | null;
}

const json = (v: unknown): Json => (v === undefined ? null : (v as Json));

/**
 * The audit rows of «القيم» writes: the same entity as PATCH /settings ('settings', the nil id). A value
 * is action 'update' with that key's before/after; a description is 'describe:<key>'.
 */
@Injectable()
export class ConfigEntriesAudit {
  constructor(private readonly audit: AuditService) {}

  value(a: ValueAudit): Promise<void> {
    return this.audit.record({
      actorId: a.actorId,
      entity: 'settings',
      entityId: SINGLETON_ENTITY_ID,
      action: 'update',
      before: { [a.key]: json(a.before) },
      after: { [a.key]: json(a.after) },
    });
  }

  description(a: DescriptionAudit): Promise<void> {
    return this.audit.record({
      actorId: a.actorId,
      entity: 'settings',
      entityId: SINGLETON_ENTITY_ID,
      action: `describe:${a.key}`,
      before: { description: a.before },
      after: { description: a.after },
    });
  }
}
