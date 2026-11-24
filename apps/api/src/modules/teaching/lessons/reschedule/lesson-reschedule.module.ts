import { Module } from '@nestjs/common';
import { TeachersModule } from '@/modules/people/teachers';
import { SchedulingModule } from '@/modules/teaching/scheduling';
import { LessonStatusModule } from '@/modules/teaching/lessons/status';
import { LessonStoreModule } from '@/modules/teaching/lessons/store';
import { LessonRescheduleController } from './lesson-reschedule.controller';
import { RescheduleOneService } from './reschedule-one.service';
import { RescheduleRuleService } from './reschedule-rule.service';
import { RuleCancelController } from './rule-cancel.controller';
import { RulePlanner } from './rule-planner';

@Module({
  imports: [LessonStoreModule, LessonStatusModule, SchedulingModule, TeachersModule],
  controllers: [LessonRescheduleController, RuleCancelController],
  providers: [RescheduleOneService, RescheduleRuleService, RulePlanner],
  exports: [RescheduleOneService],
})
export class LessonRescheduleModule {}
