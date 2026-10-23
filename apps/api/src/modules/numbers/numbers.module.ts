import { Module } from '@nestjs/common';
import { CommunicationsController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { NumbersConfig } from './numbers.config';
import { NumbersController } from './numbers.controller';
import { NumbersEffects } from './numbers.effects';
import { NumbersHealth } from './numbers.health';
import { NumbersImport } from './numbers.import';
import { NumbersQueries } from './numbers.queries';
import { NumbersSecrets } from './numbers.secrets';
import { NumbersService } from './numbers.service';
import { NumbersSettings } from './numbers.settings';

/**
 * Academy numbers (docs/23 §2c, phase 3): wa_numbers, the per-number Vault secrets, the import, parity
 * and the comms_source switch. Exports NumbersConfig (the line config port) and NumbersHealth (the line
 * check's per-number store) to WhatsappModule, which imports this module so the config loads first.
 * DB, settings and audit come from the global modules.
 */
@Module({
  controllers: [NumbersController, CommunicationsController],
  providers: [NumbersSettings, NumbersQueries, NumbersSecrets, NumbersConfig, NumbersEffects, NumbersService, NumbersImport, CommunicationsService, NumbersHealth],
  exports: [NumbersConfig, NumbersHealth],
})
export class NumbersModule {}
