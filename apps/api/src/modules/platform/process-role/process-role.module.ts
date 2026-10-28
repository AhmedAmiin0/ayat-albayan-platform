import { Module } from '@nestjs/common';
import { ConfigReloadJob } from './config-reload.job';
import { InternalJobsController } from './jobs.controller';

/** The worker's internal kick route and its config reload (docs/09 «Two API copies + one worker»). */
@Module({ controllers: [InternalJobsController], providers: [ConfigReloadJob] })
export class ProcessRoleModule {}
