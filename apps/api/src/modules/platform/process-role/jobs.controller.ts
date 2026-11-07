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
import { Public } from '@/common/auth/decorators';
import { kickable } from '@/config/role/background-job';
import { ZodQuery } from '@/common/http/zod-inputs';
import { kickOptionsOfQuery, kickQuerySchema, type KickQuery } from '@/config/role/kick-options';
import { INTERNAL_HEADER, validInternalToken } from '@/config/role/worker-kick';
import { ConfigReloadJob } from './config-reload.job';

type KickMethod = (this: unknown, options: object) => unknown;

const forbidden = () => new ForbiddenException({ code: 'forbidden', message: 'forbidden' });

/**
 * The worker's kick route: an API copy's «run now» (kickWorker). Served only by the worker (role-http:
 * the API copies answer 404 for /internal/*, but for the peer reload below), and only with the internal
 * token. Answers 202 as soon as the kick is queued; `?wait=1` (Outbox.send) answers once the job's
 * pass is done, as the local kick resolved (docs/42 42-8). `?lane=` names the job's lane (42-7).
 */
@ApiExcludeController()
@Controller('internal/jobs')
export class InternalJobsController {
  constructor(private readonly refs: ModuleRef) {}

  @Public()
  @Post(':name/kick')
  @HttpCode(202)
  async kick(
    @Param('name') name: string,
    @Headers(INTERNAL_HEADER) token: string | undefined,
    @ZodQuery(kickQuerySchema) query: KickQuery = {},
  ): Promise<void> {
    if (!validInternalToken(token)) throw forbidden();
    const found = kickable(name);
    if (!found) throw new NotFoundException({ code: 'not_found', message: 'not_found' });
    const { wait, ...options } = kickOptionsOfQuery(query);
    const job: unknown = this.refs.get(found.job, { strict: false });
    const run = (job as Record<string, unknown>)[found.method];
    if (typeof run !== 'function') return;
    // A kick never rejects (the pass logs); the catch keeps an unwaited one from going unhandled.
    const pass = Promise.resolve((run as KickMethod).call(job, options)).catch(() => undefined);
    await (wait ? pass : undefined);
  }

  /** PEER_RELOAD_PATH: another API copy took an admin save; reload this process's config (any role). */
  @Public()
  @Post('config-reload/here')
  @HttpCode(204)
  async peerReload(@Headers(INTERNAL_HEADER) token: string | undefined): Promise<void> {
    if (!validInternalToken(token)) throw forbidden();
    await this.refs.get(ConfigReloadJob, { strict: false }).reloadHere();
  }
}
