import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Inject,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/auth/decorators';
import { verifyChallenge, verifySignature } from './webhook.signature';
import { WEBHOOK_CONFIG, WebhookService, within, type WebhookConfig } from './webhook.service';

/**
 * ponytail: the work runs inline; after this budget Meta gets its 200 and the rest finishes in
 * the background, so a failure past the budget is only logged (no 500, no re-send). Meta re-sends
 * after ~20 s without an answer. Move to a pg-boss queue if a batch ever needs longer.
 */
export const RESPONSE_BUDGET_MS = 5_000;

/** The bits of the Fastify request / reply used here (no direct `fastify` dependency). */
interface RawRequest {
  /** Set by NestFactory.create(…, { rawBody: true }) in main.ts. */
  rawBody?: Buffer;
  body: unknown;
}
interface TypedReply {
  type(contentType: string): unknown;
}

type HubQuery = Partial<Record<'hub.mode' | 'hub.verify_token' | 'hub.challenge', string>>;

/**
 * Meta WhatsApp Cloud API webhook (R-MSG-04, R-MSG-05, R-LEAD-01, R-SCH-03; docs/12 §3.5).
 * Public: authenticated by the verify token (GET) and the X-Hub-Signature-256 HMAC (POST).
 */
@ApiTags('webhooks')
@Public()
@Controller('webhooks/whatsapp')
export class WebhookController {
  constructor(
    @Inject(WEBHOOK_CONFIG) private readonly config: WebhookConfig,
    private readonly webhook: WebhookService,
  ) {}

  /** Subscribe handshake: echo hub.challenge as plain text when the verify token matches. */
  @Get()
  challenge(@Query() q: HubQuery, @Res({ passthrough: true }) reply: TypedReply): string {
    const query = { mode: q['hub.mode'], token: q['hub.verify_token'], challenge: q['hub.challenge'] };
    const challenge = verifyChallenge(query, this.config.verifyToken);
    if (challenge === null) throw new ForbiddenException();
    reply.type('text/plain');
    return challenge;
  }

  /**
   * Signed events: 401 (nothing stored) unless the HMAC over the raw bytes matches. 500 when an
   * item failed within the budget (WebhookService.handle), so Meta re-sends instead of losing it.
   */
  @Post()
  @HttpCode(200)
  async receive(@Req() req: RawRequest, @Headers('x-hub-signature-256') signature?: string): Promise<void> {
    if (!verifySignature({ rawBody: req.rawBody, header: signature, secret: this.config.appSecret })) {
      throw new UnauthorizedException();
    }
    await within(this.webhook.handle(req.body), RESPONSE_BUDGET_MS);
  }
}
