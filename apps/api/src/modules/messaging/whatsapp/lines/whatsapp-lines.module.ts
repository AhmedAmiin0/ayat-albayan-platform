import { Module } from '@nestjs/common';
import { NumbersModule } from '@/modules/messaging/numbers';
import { LineHealthStore } from './line-health.store';
import { LinesCheck } from './lines.check';
import { LinesController } from './lines.controller';

/** The line check; LineHealthStore is exported for the notification rules' line health. */
@Module({
  imports: [NumbersModule],
  controllers: [LinesController],
  providers: [LinesCheck, LineHealthStore],
  exports: [LineHealthStore],
})
export class WhatsappLinesModule {}
