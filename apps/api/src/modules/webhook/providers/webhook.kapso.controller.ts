import { Controller, Headers, HttpCode, Inject, Logger, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/auth/decorators';
import { presentSignatureHeaders, verifyKapsoSignature, type KapsoSignedRequest } from '../parse/webhook.kapso-signature';
import { RESPONSE_BUDGET_MS, WEBHOOK_CONFIG, WebhookService, within, type WebhookConfig } from '../webhook.service';

/** The bits of the Fastify request used here (no direct `fastify` dependency). */
interface RawRequest {
  /** Set by NestFactory.create(…, { rawBody: true }) in main.ts. */
  rawBody?: Buffer;
  body: unknown;
}

/**
 * Kapso's webhook (docs/19): a `meta`-kind Kapso webhook forwards Meta's raw payloads, so the same
 * parser and phone_number_id line routing apply. Public: authenticated by the Kapso secret's HMAC
 * only (never a Meta app secret). Answers within RESPONSE_BUDGET_MS (Kapso gives up after 10 s,
 * retries 3 times and pauses a webhook that keeps failing).
 */
@ApiTags('webhooks')
@Public()
@Controller('webhooks/kapso')
export class KapsoWebhookController {
  private readonly log = new Logger(KapsoWebhookController.name);

  constructor(
    @Inject(WEBHOOK_CONFIG) private readonly config: WebhookConfig,
    private readonly webhook: WebhookService,
  ) {}

  /**
   * Signed events: 401 (nothing stored) unless X-Webhook-Signature (hex) or X-Hub-Signature-256
   * («sha256=» hex) is the HMAC of the raw bytes with KAPSO_WEBHOOK_SECRET. 500 when an item failed
   * within the budget, so Kapso re-sends instead of losing it.
   */
  @Post()
  @HttpCode(200)
  async receive(@Req() req: RawRequest, @Headers() headers: KapsoSignedRequest['headers']): Promise<void> {
    if (!verifyKapsoSignature({ rawBody: req.rawBody, headers, secret: this.config.kapsoSecret })) {
      const names = presentSignatureHeaders(headers);
      // Debug only, like the Meta route (silent on 401): a public URL gets probed; names, never values.
      this.log.debug(`kapso webhook refused (401); signature headers present: ${names.length > 0 ? names.join(', ') : 'none'}`);
      throw new UnauthorizedException();
    }
    await within(this.webhook.handle(req.body), RESPONSE_BUDGET_MS);
  }
}
