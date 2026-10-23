import type { CommsSource, CommsSourceView, ParityView, WaLine } from '@ab/shared';
import { ConflictException, Injectable } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { SINGLETON_ENTITY_ID } from '../../common/audit/singleton-entity';
import { envFrom } from '../../env';
import { NumbersConfig } from './numbers.config';
import { differences, parityRoles } from './numbers.parity';
import { NumbersSettings } from './numbers.settings';

/**
 * Parity and the read switch (docs/23 §2e steps 4–5). The switch to module is REFUSED (409
 * parity_not_empty) while the legacy and module paths differ anywhere; back to legacy is always
 * allowed. It writes comms_source only: never messaging_enabled, the allow-list or any other switch,
 * so flipping never opens the send gate.
 */
@Injectable()
export class CommunicationsService {
  constructor(
    private readonly settings: NumbersSettings,
    private readonly config: NumbersConfig,
    private readonly audit: AuditService,
  ) {}

  async parity(): Promise<ParityView> {
    const [source, defaults] = await Promise.all([this.config.source(), this.config.defaults()]);
    const overlay = this.config.overlayOf(defaults);
    const numbers: Partial<Record<WaLine, { id: string; label: string }>> = {};
    for (const n of defaults) numbers[n.purpose] = { id: n.id, label: n.label };
    const roles = parityRoles({ legacy: envFrom(null), module: envFrom(overlay.values), numbers });
    return { source, roles, differences: differences(roles) };
  }

  async setSource(source: CommsSource, actorId: string): Promise<CommsSourceView> {
    const before = await this.config.source();
    if (source === 'module' && (await this.parity()).differences.length > 0) {
      throw new ConflictException({ message: 'parity_not_empty' });
    }
    if (before !== source) {
      try {
        await this.settings.writeSource(source, actorId);
      } finally {
        await this.config.refresh();
      }
      await this.audit.record({
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
