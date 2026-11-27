import {
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  NotFoundException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '@/common/auth/decorators';
import { kickable } from '@/config/role/background-job';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { kickOptionsOfQuery } from '@/config/role/kick-options';
import { INTERNAL_HEADER, validInternalToken } from '@/config/role/worker-kick';
import { ConfigReloadJob } from './config-reload.job';
import { internalJobRoutes as routes } from './jobs.routes';

type KickMethod = (this: unknown, options: object) => unknown;

const forbidden = () => new ForbiddenException({ code: 'forbidden', message: 'forbidden' });

/**
 * The worker's kick route: an API copy's «run now» (kickWorker). Served only by the worker (role-http:
 * the API copies answer 404 for /internal/*, but for the peer reload below), and only with the internal
 * token. `?wait=0` answers 202 as soon as the kick is queued; `?wait=1` (Outbox.send) or no `wait`
 * (an API copy from before 42-8) answers once the pass is done (docs/42 42-8). `?lane=`: 42-7.
 */
@ApiExcludeController()
@Controller()
export class InternalJobsController {
  constructor(private readonly refs: ModuleRef) {}

  @Public()
  @Route(routes.kick)
  @HttpCode(202)
  async kick(
    @RouteInput() { params, query }: RouteInputOf<typeof routes.kick>,
    @Headers(INTERNAL_HEADER) token: string | undefined,
  ): Promise<void> {
    if (!validInternalToken(token)) throw forbidden();
    const found = kickable(params.name);
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
  @Route(routes.peerReload)
  @HttpCode(204)
  async peerReload(@Headers(INTERNAL_HEADER) token: string | undefined): Promise<void> {
    if (!validInternalToken(token)) throw forbidden();
    await this.refs.get(ConfigReloadJob, { strict: false }).reloadHere();
  }
}
