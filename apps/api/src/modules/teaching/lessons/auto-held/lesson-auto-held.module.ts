import { Module } from '@nestjs/common';
import { LessonStoreModule } from '@/modules/teaching/lessons/store';
import { AutoHeldCorrection } from './auto-held-correction';
import { AutoHeldJob } from './auto-held.job';
import { AutoHeldService } from './auto-held.service';
import { OutcomeCorrection } from './outcome-correction';
import { OutcomeSettleService } from './outcome-settle.service';

@Module({
  imports: [LessonStoreModule],
  providers: [
    ...[AutoHeldCorrection, AutoHeldJob, AutoHeldService],
    ...[OutcomeSettleService, OutcomeCorrection],
  ],
  exports: [AutoHeldCorrection, OutcomeCorrection],
})
export class LessonAutoHeldModule {}
