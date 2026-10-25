import { Controller, Headers, HttpCode, Inject, Logger, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/auth/decorators';
import { RESPONSE_BUDGET_MS, WEBHOOK_CONFIG, within, type WebhookConfig } from '../webhook.service';
import { StatusService } from '../status/webhook.status.service';
import { verifyWacrmSignature, WACRM_TOLERANCE_MS } from '../parse/webhook.wacrm-signature';
import { parseWacrm, SeenDeliveries } from './webhook.wacrm';

/** The bits of the Fastify request used here (no direct `fastify` dependency). */
interface RawRequest {
  /** Set by NestFactory.create(…, { rawBody: true }) in main.ts. */
  rawBody?: Buffer;
  body: unknown;
}

/**
 * The academy CRM's outbound webhook (docs/19 «crm driver»). Public: authenticated by WACRM_WEBHOOK_SECRET's
 * HMAC over `${t}.${rawBody}` only, within 5 minutes (a replay is refused). message.status_updated moves our
 * outbound row by its wamid (the existing delivery-status path); message.received is logged only (the CRM
 * owns that number's conversations). Deduped on the delivery id. Never sends anything.
 */
@ApiTags('webhooks')
@Public()
@Controller('webhooks/wacrm')
export class WacrmWebhookController {
  private readonly log = new Logger(WacrmWebhookController.name);
  private readonly seen = new SeenDeliveries(WACRM_TOLERANCE_MS * 2);

  constructor(
    @Inject(WEBHOOK_CONFIG) private readonly config: WebhookConfig,
    private readonly statuses: StatusService,
  ) {}

  /** 401 (nothing read) unless the signature is good and fresh; 500 when the status write failed, so it may come again. */
  @Post()
  @HttpCode(200)
  async receive(@Req() req: RawRequest, @Headers('x-wacrm-signature') signature?: string): Promise<void> {
    const now = new Date();
    const verdict = verifyWacrmSignature({ rawBody: req.rawBody, header: signature, secret: this.config.wacrmSecret, now });
    if (verdict !== 'ok') {
      // Debug only, like the other webhook routes: a public URL gets probed. The verdict, never a value.
      this.log.debug(`wacrm webhook refused (401): ${signature === undefined ? 'no signature' : verdict}`);
      throw new UnauthorizedException();
    }
    const delivery = parseWacrm(req.body, now);
    if (!delivery || !this.seen.first(delivery.id, now.getTime())) return;
    if (delivery.kind !== 'status') {
      this.log.log(`wacrm ${delivery.event} ${delivery.id}: not mirrored (the CRM owns that number's conversations)`);
      return;
    }
    try {
      await within(this.statuses.handle(delivery.status), RESPONSE_BUDGET_MS);
    } catch (e) {
      this.seen.forget(delivery.id);
      throw e;
    }
  }
}
