import {
  reportPublicRoutes as routes,
  type ReportAccessView,
  type ReportPageView,
} from '@ab/shared';
import { Controller, Header, HttpCode, Ip, Req, Res, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { Public } from '@/common/auth/decorators';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ReportCodeService } from './report-code.service';
import { ReportPublicLimit } from './report-public.limit';

type Input<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/** The Cookie header (its report token is checked by validReportSession). */
const cookieHeader = z.string().max(8192).optional();

interface CookieRequest {
  headers: { cookie?: unknown };
}

/** The parts of Fastify's reply the verify route uses. */
interface CookieReply {
  header: (name: string, value: string) => unknown;
  request: { ip: string };
}

/** Never cached: the page and the masked numbers depend on this report's cookie. */
@Public()
@UseGuards(ReportPublicLimit)
@Controller()
export class ReportPublicController {
  constructor(private readonly codes: ReportCodeService) {}

  @Route(routes.view)
  @Header('Cache-Control', 'no-store')
  view(
    @RouteInput() { params }: Input<'view'>,
    @Req() req: CookieRequest,
  ): Promise<ReportPageView> {
    const cookie = cookieHeader.safeParse(req.headers.cookie);
    const sent = cookie.success ? cookie.data : undefined;
    return this.codes.view({ publicId: params.publicId, cookie: sent });
  }

  @Route(routes.access)
  @Header('Cache-Control', 'no-store')
  access(@RouteInput() { params }: Input<'access'>): Promise<ReportAccessView> {
    return this.codes.access(params.publicId);
  }

  @Route(routes.code)
  @HttpCode(202)
  async code(@RouteInput() { params, body }: Input<'code'>, @Ip() ip: string): Promise<void> {
    await this.codes.request({ publicId: params.publicId, ip, to: body.to });
  }

  @Route(routes.verify)
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async verify(
    @RouteInput() { params, body }: Input<'verify'>,
    @Res({ passthrough: true }) res: CookieReply,
  ): Promise<void> {
    const { publicId } = params;
    const cookie = await this.codes.verify({ publicId, ip: res.request.ip, code: body.code });
    res.header('Set-Cookie', cookie);
  }
}
