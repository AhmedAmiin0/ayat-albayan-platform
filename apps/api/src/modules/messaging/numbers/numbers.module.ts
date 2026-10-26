import { Module } from '@nestjs/common';
import { CommunicationsController } from './communications/communications.controller';
import { CommunicationsDeps } from './communications/communications.deps';
import { CommunicationsService } from './communications/communications.service';
import { NumbersConfig } from './config/numbers.config';
import { NumbersController } from './numbers.controller';
import { NumbersEffects } from './numbers.effects';
import { NumbersHealth } from './lines/numbers.health';
import { NumbersImport } from './import/numbers.import';
import { NumbersQueries } from './numbers.queries';
import { NumbersSecrets } from './config/numbers.secrets';
import { NumbersService } from './numbers.service';
import { NumbersSettings } from './numbers.settings';

/**
 * Academy numbers (docs/23 §2c, phase 3): wa_numbers, the per-number Vault secrets, the import, parity
 * and the comms_source switch. Exports NumbersConfig (the line config port) and NumbersHealth (the line
 * check's per-number store) to WhatsappModule, which imports this module so the config loads first.
 * DB, settings and audit come from the global modules; RulesParity from the global NotificationRulesModule.
 */
@Module({
  controllers: [NumbersController, CommunicationsController],
  providers: [NumbersSettings, NumbersQueries, NumbersSecrets, NumbersConfig, NumbersEffects, NumbersService, NumbersImport, CommunicationsDeps, CommunicationsService, NumbersHealth],
  exports: [NumbersConfig, NumbersHealth],
})
export class NumbersModule {}
