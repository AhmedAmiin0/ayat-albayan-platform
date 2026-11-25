import { Controller, Headers, HttpCode, Inject, Logger, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/auth/decorators';
import { RESPONSE_BUDGET_MS, within, type WebhookConfig } from '@/modules/messaging/webhook/webhook.service';
import { WEBHOOK_CONFIG } from '@/modules/messaging/webhook/shared/webhook.config';
import { StatusService } from '@/modules/messaging/webhook/status/webhook.status.service';
import { verifyWacrmSignature, WACRM_TOLERANCE_MS } from '@/modules/messaging/webhook/parse/webhook.wacrm-signature';
import { CrmInbound, CrmInboundJob } from '@/modules/messaging/webhook/crm-inbound';
import { parseWacrm, SeenDeliveries, type WacrmDelivery } from './webhook.wacrm';

type Kind = WacrmDelivery['kind'];
type Of<K extends Kind> = Extract<WacrmDelivery, { kind: K }>;

/** The bits of the Fastify request used here (no direct `fastify` dependency). */
interface RawRequest {
  /** Set by NestFactory.create(…, { rawBody: true }) in main.ts. */
  rawBody?: Buffer;
  body: unknown;
}

/**
 * The academy CRM's outbound webhook (docs/19 «crm driver»). Public: authenticated by WACRM_WEBHOOK_SECRET's
 * HMAC over `${t}.${rawBody}` only, within 5 minutes (a replay is refused). message.status_updated moves our
 * outbound row by its wamid (the existing delivery-status path); message.received (a family writing to
 * the notifications number) is queued by its wamid and the mirror job kicked: it lands in the
 * inbox. Deduped on the delivery id. Never sends anything.
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
    @Inject(CrmInbound) private readonly crmInbound: CrmInbound,
    @Inject(CrmInboundJob) private readonly crmInboundJob: CrmInboundJob,
  ) {}

  /** 401 (nothing read) unless the signature is good and fresh; 500 when a write failed (it may come again). */
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
    try {
      await within(this.apply(delivery), RESPONSE_BUDGET_MS);
    } catch (e) {
      this.seen.forget(delivery.id);
      throw e;
    }
  }

  /** Ticks → the delivery-status path; a received message → the mirror's queue; else logged. */
  private readonly on: { [K in Kind]: (d: Of<K>) => Promise<void> } = {
    status: async (d) => {
      await this.statuses.handle(d.status);
    },
    received: async (d) => {
      await this.crmInbound.accept(d.received);
      this.crmInboundJob.kick().catch(() => undefined);
    },
    other: (d) => {
      this.log.log(`wacrm ${d.event} ${d.id}: not mirrored`);
      return Promise.resolve();
    },
  };

  private apply<K extends Kind>(d: Of<K>): Promise<void> {
    const run: (x: Of<K>) => Promise<void> = this.on[d.kind];
    return run(d);
  }
}
