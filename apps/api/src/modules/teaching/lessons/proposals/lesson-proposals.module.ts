import { Module } from '@nestjs/common';
import { LessonRescheduleModule } from '@/modules/teaching/lessons/reschedule';
import { LessonStoreModule } from '@/modules/teaching/lessons/store';
import { LessonProposalsController } from './lesson-proposals.controller';
import { LessonProposalRepo } from './lesson-proposals.repo';
import { LessonProposeService, ProposalDecisionService } from './lesson-proposals.service';
import { RequestDeclinePush } from './request-decline.push';

@Module({
  imports: [LessonStoreModule, LessonRescheduleModule],
  controllers: [LessonProposalsController],
  providers: [
    ...[LessonProposalRepo, LessonProposeService],
    ...[ProposalDecisionService, RequestDeclinePush],
  ],
  exports: [LessonProposalRepo, ProposalDecisionService],
})
export class LessonProposalsModule {}
