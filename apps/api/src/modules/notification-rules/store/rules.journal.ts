import type { Json } from '@ab/db';
import type { EffectiveRule, RuleSettings } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { ActivityWriter } from '../../../common/activity/activity.writer';
import { AuditService } from '../../../common/audit/audit.service';
import { SINGLETON_ENTITY_ID } from '../../../common/audit/singleton-entity';
import type { AuthUser } from '../../../common/auth/verify-token';

export interface RuleChange {
  key: string;
  actor: AuthUser;
  before: EffectiveRule;
  after: EffectiveRule;
  /** The legacy keys written with it (legacy mode). */
  legacy: Partial<RuleSettings>;
  essentialOff: boolean;
}

/** The activity-log action of an essential row switched off (owner answer 3, docs/23). */
export const ESSENTIAL_OFF_ACTION = 'notification_essential_off';

const json = (v: unknown): Json => JSON.parse(JSON.stringify(v)) as Json;

/**
 * Every rule write is audited (audit_log entity 'notification_rules'; the key is not a uuid, so it goes
 * in the action and in before/after, like custom_config). An essential OFF also gets its own
 * activity_log row (queued, never fails the request).
 */
@Injectable()
export class RulesJournal {
  constructor(
    private readonly audit: AuditService,
    private readonly activity: ActivityWriter,
  ) {}

  async record(change: RuleChange): Promise<void> {
    await this.audit.record({
      actorId: change.actor.id,
      entity: 'notification_rules',
      entityId: SINGLETON_ENTITY_ID,
      action: `update:${change.key}`,
      before: json({ key: change.key, ...change.before }),
      after: json({ key: change.key, ...change.after, legacy: change.legacy }),
    });
    if (!change.essentialOff) return;
    this.activity.push({
      actor_id: change.actor.id,
      actor_role: change.actor.role ?? 'unknown',
      action: ESSENTIAL_OFF_ACTION,
      method: 'PATCH',
      route: '/admin/notifications/:key',
      entity: 'notification_rules',
      entity_id: change.key,
      status: 200,
      duration_ms: 0,
      meta: { key: change.key },
    });
  }

  /** The flip back to legacy (docs/23b decision 5): the rules' values copied into the legacy keys. */
  recordCopy(actorId: string, values: Partial<RuleSettings>): Promise<void> {
    return this.audit.record({
      actorId,
      entity: 'settings',
      entityId: SINGLETON_ENTITY_ID,
      action: 'rules_to_legacy',
      after: json(values),
    });
  }
}
