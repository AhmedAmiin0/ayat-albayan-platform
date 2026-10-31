import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ActivityController, AuthSessionController } from './activity.controller';
import { ActivityInterceptor } from './activity.interceptor';
import { ActivityQueries } from './activity.queries';
import { ActivityRetentionJob } from './activity.retention.job';
import { ActivityWriter } from './activity.writer';

/**
 * Activity log (owner, 2026-10-05; docs/04 §10): the global interceptor that records every
 * mutating request, the sign-in/out reports of the web, GET /activity, and 180-day retention.
 */
@Module({
  controllers: [ActivityController, AuthSessionController],
  providers: [
    ActivityWriter,
    ActivityQueries,
    ActivityRetentionJob,
    { provide: APP_INTERCEPTOR, useClass: ActivityInterceptor },
  ],
  // Modules that log a domain event of their own (notification-rules: an essential row switched off).
  exports: [ActivityWriter],
})
export class ActivityModule {}
