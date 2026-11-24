import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '@/modules/finance/subscriptions';
import { SchedulingModule } from '@/modules/teaching/scheduling';
import { CoursePauseController } from './course-pause.controller';
import { CoursePauseFollowUps } from './course-pause.follow-ups';
import { CoursePauseJob } from './course-pause.job';
import { CoursePauseLessonsBack, PauseClashes, PauseScheduling } from './course-pause.lessons-back';
import { CoursePausePreviews } from './preview/course-pause.preview';
import { CoursePauseRepo } from './course-pause.repo';
import { CoursePauseService } from './course-pause.service';

/** Course pause, extend and resume for any student (docs/11 §7b), plus the hourly auto-resume. */
@Module({
  imports: [SchedulingModule, SubscriptionsModule],
  controllers: [CoursePauseController],
  providers: [
    CoursePauseFollowUps,
    CoursePauseJob,
    CoursePauseLessonsBack,
    CoursePausePreviews,
    CoursePauseRepo,
    CoursePauseService,
    PauseClashes,
    PauseScheduling,
  ],
})
export class CoursePauseModule {}
