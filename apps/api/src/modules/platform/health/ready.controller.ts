import type { Readiness } from '@ab/shared';
import { Controller, Header, Inject, Res } from '@nestjs/common';
import { Route } from '@/common/http/route';
import { healthRoutes as routes } from './health.routes';
import { httpStatusOf } from './readiness.rollup';
import { ReadinessService } from './readiness.service';

/** The one reply method used (Fastify's reply; no fastify type import in app code). */
interface StatusReply {
  status(code: number): unknown;
}

@Controller()
export class ReadyController {
  // @Inject(Class): the class is a value here (DI), not only a type (docs/31b §3.2).
  constructor(@Inject(ReadinessService) private readonly readiness: ReadinessService) {}

  /**
   * Readiness (docs/09): 200 ok|degraded, 503 down (the database). The deploy gate and an outside
   * uptime monitor read it. The load balancer keeps /health, so a database blip never takes both
   * API copies out at once.
   */
  @Route(routes.ready)
  @Header('Cache-Control', 'no-store')
  async check(@Res({ passthrough: true }) reply: StatusReply): Promise<Readiness> {
    const view = await this.readiness.check();
    void reply.status(httpStatusOf(view.status));
    return view;
  }
}
