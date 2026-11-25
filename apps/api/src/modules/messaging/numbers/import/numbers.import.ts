import type { ImportResult, ImportRoleView } from '@ab/shared';
import { WA_PROVIDERS } from '@ab/catalog';
import { Injectable, Logger } from '@nestjs/common';
import { ar } from '@/common/infra/i18n/server-text';
import { integrationOverlay } from '@/common/configuration/integrations/integration-overlay';
import { envFrom } from '@/config/env/env';
import { SINGLETON_ENTITY_ID } from '@/common/audit/singleton-entity';
import { NumbersEffects } from '@/modules/messaging/numbers/numbers.effects';
import { planAll, type RolePlan } from './numbers.import-plan';
import { NumbersRepo } from '@/modules/messaging/numbers/numbers.repo';
import { NumbersSecrets } from '@/modules/messaging/numbers/config/numbers.secrets';

/** The response view of a plan: no copy sources, no row draft. */
const toView = (p: RolePlan): ImportRoleView => ({
  role: p.role,
  action: p.action,
  number_id: p.number_id,
  fields: p.fields,
  secrets_to_copy: p.secrets_to_copy,
  ...(p.not_importable ? { not_importable: p.not_importable } : {}),
});

/** Something to write: a row to create (none for a role that is not importable) or a secret to copy. */
const hasWork = (p: RolePlan): boolean => (p.action === 'create' && p.row !== null) || p.copies.length > 0;

/** Dry run or apply (docs/23 §2e): never deletes; re-apply is a no-op; only key names logged. */
@Injectable()
export class NumbersImport {
  private readonly log = new Logger(NumbersImport.name);

  constructor(
    private readonly queries: NumbersRepo,
    private readonly secrets: NumbersSecrets,
    private readonly effects: NumbersEffects,
  ) {}

  async run(dryRun: boolean, actorId: string): Promise<ImportResult> {
    const plans = await this.plan();
    const changed = plans.some(hasWork);
    if (!dryRun && changed) {
      try {
        for (const p of plans) await this.apply(p, actorId);
      } finally {
        // One audit row (roles, ids, secret NAMES) and the refresh, even when a role failed half-way.
        const roles = plans.map((p) => ({ role: p.role, action: p.action, number_id: p.number_id, secrets: p.secrets_to_copy, skipped: p.not_importable?.fields }));
        await this.effects.after({ actorId, entity: 'wa_numbers', entityId: SINGLETON_ENTITY_ID, action: 'import', after: { roles } });
      }
    }
    return { dry_run: dryRun, changed, roles: plans.map(toView) };
  }

  private async plan(): Promise<RolePlan[]> {
    const [rows, status] = await Promise.all([this.queries.all(), this.secrets.status()]);
    return planAll({ legacy: envFrom(null), db: integrationOverlay(), env: process.env, rows, status });
  }

  private async apply(p: RolePlan, actorId: string): Promise<void> {
    if (p.action === 'unconfigured' || !p.row) return;
    const id = p.number_id ?? (await this.create(p, actorId));
    p.number_id = id;
    for (const c of p.copies) {
      const target = { id, name: c.name };
      if (c.source === 'db') {
        if (!(await this.secrets.copy(target, c.key))) this.log.warn(`import: ${c.key} was not in Vault, not copied`);
        continue;
      }
      const value = process.env[c.key]?.trim();
      if (value) await this.secrets.set(target, value);
    }
  }

  private async create(p: RolePlan, actorId: string): Promise<string> {
    const row = p.row;
    if (!row) throw new Error('import: no row to create');
    const isDefault = !(await this.queries.hasDefault(p.role));
    const created = await this.queries.insert({
      row: { label: ar.numbers.defaultLabel[p.role], purpose: p.role, enabled: true, is_default: isDefault, ...row, provider: WA_PROVIDERS.find((v) => v === row.provider) ?? 'meta' },
      actorId,
    });
    return created.id;
  }
}
