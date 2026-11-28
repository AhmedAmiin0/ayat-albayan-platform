import type { RouteResult } from '@ab/core';
import { Controller } from '@nestjs/common';
import { Route } from '@/common/http/route';
import { StorageHealth } from '@/common/storage/probe';
import { healthRoutes as routes } from './health.routes';

@Controller()
export class HealthController {
  constructor(private readonly storage: StorageHealth) {}

  /**
   * Liveness probe (R-NFR-07), always 200 while the process serves: the load balancer and Docker
   * read it. `storage` reports the store new files go to (docs/45): «down» is for the owner to see,
   * never a reason to take a copy out of the balancer.
   */
  @Route(routes.health)
  async check(): Promise<RouteResult<typeof routes.health>> {
    return { status: 'ok', storage: await this.storage.view() };
  }
}
