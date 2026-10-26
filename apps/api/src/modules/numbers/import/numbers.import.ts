import { WA_PROVIDERS, type ImportResult, type ImportRoleView } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { ar } from '../../../common/i18n/server-text';
import { integrationOverlay } from '../../../common/integrations/integration-overlay';
import { envFrom } from '../../../config/env/env';
import { SINGLETON_ENTITY_ID } from '../../../common/audit/singleton-entity';
import { NumbersEffects } from '../numbers.effects';
import { planAll, type RolePlan } from './numbers.import-plan';
import { NumbersQueries } from '../numbers.queries';
import { NumbersSecrets } from '../config/numbers.secrets';

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

/**
 * «استيراد الإعداد الحالي» (docs/23 §2e step 2): copies today's effective line config into number rows.
 * Dry run: the plan only. Apply: inserts the missing rows (enabled, default for their role unless a
 * live default exists) and copies the missing secrets server-side: a DB secret Vault→Vault inside one
 * RPC (wa_number_secret_copy), an env-only one read here and written with wa_number_secret_set. Never
 * deletes an integration_config row or a Vault entry; a second apply finds nothing to do (changed false).
 * A role that is not importable (an id fails the wa_numbers checks) is skipped: no row, no copy, no 500.
 * Only key names are ever logged or audited.
 */
@Injectable()
export class NumbersImport {
  private readonly log = new Logger(NumbersImport.name);

  constructor(
    private readonly queries: NumbersQueries,
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
