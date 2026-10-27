import { Module } from '@nestjs/common';
import { InternalJobsController } from './jobs.controller';

/** The worker's internal kick route (docs/09 «Two API copies + one worker»). */
@Module({ controllers: [InternalJobsController] })
export class ProcessRoleModule {}
