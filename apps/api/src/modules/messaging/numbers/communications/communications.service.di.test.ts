import { describe, expect, it } from 'vitest';
import { AuditService } from '@/common/audit/audit.service';
import { RulesParity } from '@/modules/messaging/notification-rules/sync/rules.parity';
import { NumbersConfig } from '@/modules/messaging/numbers/config/numbers.config';
import { NumbersSettings } from '@/modules/messaging/numbers/numbers.settings';
import { CommunicationsService } from './communications.service';

// docs/32 s2 (D1: constructors take 4): the CommunicationsDeps bag is gone; Nest injects each one.
describe('CommunicationsService DI', () => {
  it('takes the settings, the config, AuditService and RulesParity in its constructor', () => {
    const types: unknown = Reflect.getMetadata('design:paramtypes', CommunicationsService);
    expect(types).toEqual([NumbersSettings, NumbersConfig, AuditService, RulesParity]);
  });
});
