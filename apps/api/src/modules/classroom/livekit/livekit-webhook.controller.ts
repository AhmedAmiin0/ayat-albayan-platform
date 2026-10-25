import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/auth/decorators';
import { LivekitWebhookService } from './livekit-webhook.service';

/** LiveKit posts `application/webhook+json`, which Fastify does not parse: kept as the raw bytes. */
export const LIVEKIT_WEBHOOK_TYPE = 'application/webhook+json';

/** Registers the raw parser for LiveKit's content type (main.ts and the test harness, before init). */
export function registerLivekitWebhookParser(app: NestFastifyApplication): void {
  app
    .getHttpAdapter()
    .getInstance()
    .addContentTypeParser(LIVEKIT_WEBHOOK_TYPE, { parseAs: 'buffer' }, (_req, body, done) => done(null, body));
}

interface RawRequest {
  /** A Buffer for application/webhook+json; parsed JSON otherwise (then rawBody holds the bytes). */
  body: unknown;
  rawBody?: Buffer;
}

/** Public: authenticated by LiveKit's signed Authorization JWT (LivekitWebhookService). */
@ApiTags('classroom')
@Public()
@Controller('livekit/webhook')
export class LivekitWebhookController {
  constructor(private readonly webhook: LivekitWebhookService) {}

  @Post()
  @HttpCode(200)
  async receive(@Req() req: RawRequest, @Headers('authorization') authorization?: string): Promise<void> {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : req.rawBody;
    await this.webhook.handle({ rawBody, authorization });
  }
}
