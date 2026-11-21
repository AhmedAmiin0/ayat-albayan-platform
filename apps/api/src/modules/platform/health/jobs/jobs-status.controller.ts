import type { JobStatusList } from '@ab/shared';
import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@/common/auth/decorators';
import { BeatReader } from '@/common/jobs/beats';
import { jobStatusRows } from './jobs-status.view';

/** Admins: each background job's last success and last error (docs/09 «Readiness»). */
@ApiTags('settings')
@ApiBearerAuth()
@Permissions('settings.write')
@Controller('admin/jobs')
export class JobsStatusController {
  // @Inject(Class): the class is a value here (DI), not only a type (docs/31b §3.2).
  constructor(@Inject(BeatReader) private readonly reader: BeatReader) {}

  @Get()
  async list(): Promise<JobStatusList> {
    const beats = (await this.reader.read()) ?? [];
    return { data: jobStatusRows(beats, Date.now()) };
  }
}
