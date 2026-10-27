import {
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../../../common/auth/decorators';
import { kickable } from '../../../config/role/background-job';
import { INTERNAL_HEADER, validInternalToken } from '../../../config/role/worker-kick';

/**
 * The worker's kick route: an API copy's «run now» (kickWorker). Served only by the worker (role-http:
 * the load balancer's API copies answer 404 for /internal/*), and only with the internal token. Answers
 * once the job's pass is done, as the local kick resolved.
 */
@ApiExcludeController()
@Controller('internal/jobs')
export class InternalJobsController {
  constructor(private readonly refs: ModuleRef) {}

  @Public()
  @Post(':name/kick')
  @HttpCode(204)
  async kick(
    @Param('name') name: string,
    @Headers(INTERNAL_HEADER) token: string | undefined,
  ): Promise<void> {
    if (!validInternalToken(token))
      throw new ForbiddenException({ code: 'forbidden', message: 'forbidden' });
    const found = kickable(name);
    if (!found) throw new NotFoundException({ code: 'not_found', message: 'not_found' });
    const job: unknown = this.refs.get(found.job, { strict: false });
    const run = (job as Record<string, unknown>)[found.method];
    if (typeof run === 'function') await (run as (this: unknown) => Promise<unknown>).call(job);
  }
}
