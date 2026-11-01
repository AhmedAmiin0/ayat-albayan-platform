import { Inject, Injectable, Logger } from '@nestjs/common';
import { IntegrationConfigService } from '@/common/configuration/integrations/integration-config.service';
import { lineEnvs, loadEnv, type CrmLineEnv, type WhatsappEnv } from '@/config/env/env';
import { crmFetch, type CrmConn, type FetchLike } from '@/modules/messaging/whatsapp';
import { CRM_WEBHOOK_ERRORS, crmStep } from './crm-webhook.errors';
import type { CrmCreated, CrmWebhookResult } from './crm-webhook.schemas';
import { createEndpoint, deleteEndpoint, listEndpoints, receiverUrl } from './crm-webhooks.client';

/** What the registrar reads: the notifications line, the API's public URL and the CRM fetch. */
export interface CrmWebhookSource {
  line: () => WhatsappEnv | null;
  publicUrl: () => string | undefined;
  fetch: FetchLike;
}

export const CRM_WEBHOOK_SOURCE = Symbol('CRM_WEBHOOK_SOURCE');

/** The live source: loadEnv() (env + «التكاملات») per call, API_PUBLIC_URL, crmFetch (H-1). */
export const liveCrmWebhookSource = (): CrmWebhookSource => ({
  line: () => lineEnvs(loadEnv()).notifications,
  publicUrl: () => process.env.API_PUBLIC_URL,
  fetch: crmFetch,
});

const TIMEOUT_MS = 15_000;
const SECRET_KEY = 'WACRM_WEBHOOK_SECRET';
const onCrm = (env: WhatsappEnv | null): env is CrmLineEnv => env?.provider === 'crm';

/**
 * Delivery ticks from the academy CRM in one click (docs/19 «crm driver»). With the notifications
 * line's own CRM key (scope webhooks:manage): removes the CRM's endpoints aimed at our receiver,
 * creates one for message.status_updated and stores the secret the CRM shows once as
 * WACRM_WEBHOOK_SECRET (Vault, through the «التكاملات» write path). The secret is never logged,
 * returned or thrown: logs carry the endpoint id and counts only.
 */
@Injectable()
export class CrmWebhookRegistrar {
  private readonly log = new Logger(CrmWebhookRegistrar.name);

  constructor(
    @Inject(IntegrationConfigService)
    private readonly config: Pick<IntegrationConfigService, 'setSecret'>,
    @Inject(CRM_WEBHOOK_SOURCE) private readonly source: CrmWebhookSource,
  ) {}

  async register(): Promise<CrmWebhookResult> {
    const { conn, target } = this.prerequisites();
    const replaced = await crmStep(() => this.removeOld(conn, target));
    const created = await crmStep(() => createEndpoint(conn, target));
    await this.store(conn, created);
    this.log.log(`crm webhook ${created.id} registered (${String(replaced)} replaced)`);
    return { id: created.id, url: created.url, events: created.events, replaced };
  }

  private prerequisites(): { conn: CrmConn; target: string } {
    const env = this.source.line();
    if (!onCrm(env)) throw CRM_WEBHOOK_ERRORS.crm_line_required();
    const target = receiverUrl(this.source.publicUrl());
    if (target === null) throw CRM_WEBHOOK_ERRORS.public_url_required();
    return { conn: { env, fetch: this.source.fetch, timeoutMs: TIMEOUT_MS }, target };
  }

  /** Every endpoint already aimed at our receiver: its secret is unknown here, so it goes. */
  private async removeOld(conn: CrmConn, target: string): Promise<number> {
    const same = (await listEndpoints(conn)).filter((e) => e.url === target);
    for (const e of same) await deleteEndpoint(conn, e.id);
    return same.length;
  }

  /** Vault + overlay reload + worker kick; on failure the new endpoint is removed (best effort). */
  private async store(conn: CrmConn, created: CrmCreated): Promise<void> {
    try {
      await this.config.setSecret({ key: SECRET_KEY, value: created.secret });
    } catch {
      // Never the error itself: a database error may quote the value it refused.
      this.log.error(`crm webhook ${created.id}: ${SECRET_KEY} not stored, removing the endpoint`);
      await deleteEndpoint(conn, created.id).catch(() => {
        this.log.warn(`crm webhook ${created.id}: could not be removed, remove it in the CRM`);
      });
      throw CRM_WEBHOOK_ERRORS.secret_store_failed();
    }
  }
}
