import { NOTIFICATION_KEYS, notificationEntry, rulePatchSchema, type NotificationKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { ruleError, unknownRule } from '../rules.errors';
import { RulesJournal } from './rules.journal';
import { planPatch, type PatchPlan } from '../rules.patch';
import { RulesPersist } from './rules.persist';

interface RuleWrite {
  key: string;
  body: unknown;
  actor: AuthUser;
}

const isKey = (key: string): key is NotificationKey => (NOTIFICATION_KEYS as readonly string[]).includes(key);

/**
 * PATCH /admin/notifications/:key (docs/23b decision 4): parse, plan on a fresh snapshot, check the
 * number, write the row (+ the legacy mirror in legacy mode), audit. Nothing here reads or writes
 * messaging_enabled, auto_messages_enabled, crm_cutover_done or comms_source.
 */
@Injectable()
export class RulesWriter {
  constructor(
    private readonly persist: RulesPersist,
    private readonly journal: RulesJournal,
  ) {}

  async apply(input: RuleWrite): Promise<NotificationKey> {
    if (!isKey(input.key)) throw unknownRule();
    const parsed = rulePatchSchema.safeParse(input.body ?? {});
    if (!parsed.success) throw ruleError('invalid', parsed.error.issues[0]?.path.join('.') || 'body');
    const plan = planPatch({ entry: notificationEntry(input.key), snapshot: await this.persist.snapshot(), patch: parsed.data });
    await this.checkNumber(plan);
    await this.persist.save({ row: plan.row, legacy: plan.legacy, actorId: input.actor.id });
    await this.journal.record({ key: input.key, actor: input.actor, ...pick(plan) });
    return input.key;
  }

  private async checkNumber(plan: PatchPlan): Promise<void> {
    const id = plan.row.number_id;
    if (id !== null && id !== plan.before.number_id && !(await this.persist.numberExists(id))) throw ruleError('unknown_number');
  }
}

const pick = (p: PatchPlan) => ({ before: p.before, after: p.after, legacy: p.legacy, essentialOff: p.essentialOff });
