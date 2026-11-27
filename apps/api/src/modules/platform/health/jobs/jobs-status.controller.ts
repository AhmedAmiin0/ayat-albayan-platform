import type { JobStatusList } from '@ab/shared';
import { Controller, Inject } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BeatReader } from '@/common/jobs/beats';
import { Route } from '@/common/http/route';
import { asResponse } from '@/common/http/returns';
import { jobStatusRows } from './jobs-status.view';
import { jobsStatusRoutes as routes } from './jobs.routes';

/** Admins: each background job's last success and last error (docs/09 «Readiness»). */
@ApiBearerAuth()
@Controller()
export class JobsStatusController {
  // @Inject(Class): the class is a value here (DI), not only a type (docs/31b §3.2).
  constructor(@Inject(BeatReader) private readonly reader: BeatReader) {}

  @Route(routes.list)
  async list(): Promise<JobStatusList> {
    const beats = (await this.reader.read()) ?? [];
    return asResponse(routes.list.response, { data: jobStatusRows(beats, Date.now()) });
  }
}
