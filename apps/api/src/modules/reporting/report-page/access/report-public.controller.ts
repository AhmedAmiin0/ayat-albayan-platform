import {
  reportCodeRequestSchema,
  reportCodeVerifySchema,
  reportPublicIdSchema,
  type ReportAccessView,
  type ReportCodeRequest,
  type ReportCodeVerify,
  type ReportPageView,
} from '@ab/shared';
import { Controller, Get, Header, HttpCode, Ip, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Public } from '@/common/auth/decorators';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { ReportCodeService } from './report-code.service';
import { ReportPublicLimit } from './report-public.limit';

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

/**
 * /report/<public_id> for a viewer who is not signed in (owner 2026-11-06): the masked numbers a
 * code may go to, the code, then the page with this report's cookie (never another report's).
 * 404 report_not_found, 401 code_required / invalid_code, 429 too_many_requests,
 * 503 codes_unavailable. Never cached.
 */
@ApiTags('reports')
@Public()
@UseGuards(ReportPublicLimit)
@Controller('public/report-pages/:publicId')
export class ReportPublicController {
  constructor(private readonly codes: ReportCodeService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  view(
    @ZodParam('publicId', reportPublicIdSchema) publicId: string,
    @Req() req: CookieRequest,
  ): Promise<ReportPageView> {
    const cookie = cookieHeader.safeParse(req.headers.cookie);
    return this.codes.view({ publicId, cookie: cookie.success ? cookie.data : undefined });
  }

  @Get('access')
  @Header('Cache-Control', 'no-store')
  access(@ZodParam('publicId', reportPublicIdSchema) publicId: string): Promise<ReportAccessView> {
    return this.codes.access(publicId);
  }

  @Post('code')
  @HttpCode(202)
  async code(
    @ZodParam('publicId', reportPublicIdSchema) publicId: string,
    @ZodBody(reportCodeRequestSchema) body: ReportCodeRequest,
    @Ip() ip: string,
  ): Promise<void> {
    await this.codes.request({ publicId, ip, to: body.to });
  }

  @Post('verify')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async verify(
    @ZodParam('publicId', reportPublicIdSchema) publicId: string,
    @ZodBody(reportCodeVerifySchema) body: ReportCodeVerify,
    @Res({ passthrough: true }) res: CookieReply,
  ): Promise<void> {
    const cookie = await this.codes.verify({ publicId, ip: res.request.ip, code: body.code });
    res.header('Set-Cookie', cookie);
  }
}
