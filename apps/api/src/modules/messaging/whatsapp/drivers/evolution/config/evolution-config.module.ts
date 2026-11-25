import { Module } from '@nestjs/common';
import { NumbersModule } from '@/modules/messaging/numbers';
import { NumbersEvolutionController } from './evolution-admin.controller';
import { EvolutionConfigController } from './evolution-config.controller';

/** /admin/numbers/:id/evolution: an Evolution number's state, QR code and pushed config. */
@Module({
  imports: [NumbersModule],
  controllers: [NumbersEvolutionController, EvolutionConfigController],
})
export class EvolutionConfigModule {}
