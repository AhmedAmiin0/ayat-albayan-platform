import type { ImportResult, ImportRoleView } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { ar } from '../../common/i18n/server-text';
import { integrationOverlay } from '../../common/integrations/integration-overlay';
import { envFrom } from '../../env';
import { NumbersConfig } from './numbers.config';
import { planAll, type RolePlan } from './numbers.import-plan';
import { NumbersQueries } from './numbers.queries';
import { NumbersSecrets } from './numbers.secrets';

/** The response view of a plan: no copy sources, no row draft. */
const toView = (p: RolePlan): ImportRoleView => ({
  role: p.role,
  action: p.action,
  number_id: p.number_id,
  fields: p.fields,
  secrets_to_copy: p.secrets_to_copy,
});

/**
 * «استيراد الإعداد الحالي» (docs/23 §2e step 2): copies today's effective line config into number rows.
 * Dry run: the plan only. Apply: inserts the missing rows (enabled, default for their role unless a
 * live default exists) and copies the missing secrets server-side: a DB secret Vault→Vault inside one
 * RPC (wa_number_secret_copy), an env-only one read here and written with wa_number_secret_set. Never
 * deletes an integration_config row or a Vault entry; a second apply finds nothing to do (changed false).
 * Only key names are ever logged.
 */
@Injectable()
export class NumbersImport {
  private readonly log = new Logger(NumbersImport.name);

  constructor(
    private readonly queries: NumbersQueries,
    private readonly secrets: NumbersSecrets,
    private readonly config: NumbersConfig,
  ) {}

  async run(dryRun: boolean, actorId: string): Promise<ImportResult> {
    const plans = await this.plan();
    const changed = plans.some((p) => p.action === 'create' || p.copies.length > 0);
    if (!dryRun && changed) {
      for (const p of plans) await this.apply(p, actorId);
      await this.config.refresh();
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
      row: { label: ar.numbers.defaultLabel[p.role], purpose: p.role, enabled: true, is_default: isDefault, ...row, provider: row.provider === 'kapso' ? 'kapso' : 'meta' },
      actorId,
    });
    return created.id;
  }
}
