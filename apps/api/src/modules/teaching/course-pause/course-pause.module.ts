import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../../finance/subscriptions';
import { SchedulingModule } from '../scheduling';
import { CoursePauseController } from './course-pause.controller';
import { CoursePauseFollowUps } from './course-pause.follow-ups';
import { CoursePauseJob } from './course-pause.job';
import { CoursePauseLessonsBack, PauseClashes, PauseScheduling } from './course-pause.lessons-back';
import { CoursePauseQueries } from './course-pause.queries';
import { CoursePauseService } from './course-pause.service';

/**
 * «إيقاف الدورة مؤقتًا» (owner 2026-10-28, docs/11 §7b): pause / extend / resume a student's course for ANY
 * student (courses.pause), and the hourly automatic resume on the day after until (CoursePauseJob).
 */
@Module({
  imports: [SchedulingModule, SubscriptionsModule],
  controllers: [CoursePauseController],
  providers: [
    CoursePauseFollowUps,
    CoursePauseJob,
    CoursePauseLessonsBack,
    CoursePauseQueries,
    CoursePauseService,
    PauseClashes,
    PauseScheduling,
  ],
})
export class CoursePauseModule {}
