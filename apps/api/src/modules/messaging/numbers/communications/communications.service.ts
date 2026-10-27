import type { CommsSource, CommsSourceView, ParityView, WaLine } from '@ab/shared';
import { ConflictException, Injectable } from '@nestjs/common';
import { SINGLETON_ENTITY_ID } from '../../../../common/audit/singleton-entity';
import { envFrom } from '../../../../config/env/env';
import { kickConfigReload } from '../../../../config/role/worker-kick';
import { CommunicationsDeps } from './communications.deps';
import { NumbersConfig } from '../config/numbers.config';
import { differences, parityRoles } from '../lines/numbers.parity';
import { NumbersSettings } from '../numbers.settings';

/**
 * Parity and the read switch (docs/23 §2e steps 4–5, docs/23b decision 5). The switch to module is
 * REFUSED (409 parity_not_empty) while the legacy and module paths differ anywhere: a number field or
 * a notification rule's mapped part. Back to legacy is always allowed, after copying the rules'
 * effective values into the legacy keys. It writes comms_source (and those 8 rule keys) only: never
 * messaging_enabled, the allow-list or any other switch, so flipping never opens the send gate.
 */
@Injectable()
export class CommunicationsService {
  constructor(
    private readonly settings: NumbersSettings,
    private readonly config: NumbersConfig,
    private readonly deps: CommunicationsDeps,
  ) {}

  async parity(): Promise<ParityView> {
    const [source, defaults, rules] = await Promise.all([this.config.source(), this.config.defaults(), this.deps.rules.differences()]);
    const overlay = this.config.overlayOf(defaults);
    const numbers: Partial<Record<WaLine, { id: string; label: string }>> = {};
    for (const n of defaults) numbers[n.purpose] = { id: n.id, label: n.label };
    const roles = parityRoles({ legacy: envFrom(null), module: envFrom(overlay.values), numbers });
    return { source, roles, differences: differences(roles), rules };
  }

  async setSource(source: CommsSource, actorId: string): Promise<CommsSourceView> {
    const before = await this.config.source();
    if (source === 'module' && before !== 'module') {
      const view = await this.parity();
      if (view.differences.length > 0 || (view.rules ?? []).length > 0) throw new ConflictException({ message: 'parity_not_empty' });
    }
    if (before === source) return { source };
    if (source === 'legacy') await this.deps.rules.copyToLegacy(actorId);
    try {
      await this.settings.writeSource(source, actorId);
    } finally {
      this.deps.rules.invalidate();
      await this.config.reload();
      await kickConfigReload();
    }
    try {
      // Again, now that legacy reads: a rule PATCH that landed between the first copy and the flip
      // wrote only notification_rules (module mode then). Idempotent: an unchanged copy rewrites the same values.
      if (source === 'legacy') await this.deps.rules.copyToLegacy(actorId);
    } finally {
      await this.deps.audit.record({
        actorId,
        entity: 'settings',
        entityId: SINGLETON_ENTITY_ID,
        action: 'comms_source',
        before: { comms_source: before },
        after: { comms_source: source },
      });
    }
    return { source: await this.config.source() };
  }
}
