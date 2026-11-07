import type { WaLine } from '@ab/shared';
import {
  Inject, Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy,
} from '@nestjs/common';
import { Ticker } from '@/common/jobs';
import { BackgroundJob } from '@/config/role/background-job';
import { TemplateVerifier } from '@/modules/messaging/whatsapp/templates/sync/template-verifier';

/** Not at boot (every API test boots AppModule): minutes after the worker starts, then daily. */
const TIMING = { firstMs: 5 * 60_000, everyMs: 24 * 60 * 60_000 };
const said = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * Owner 2026-11-07: our copy of the CRM's template text fills without anyone pressing «مزامنة».
 * One GET templates per configured crm line per run, through the template sync (the only code
 * that reads a line's list); statuses untouched. A failure is logged; the next run tries again.
 */
@BackgroundJob({ name: 'crm-template-copy' })
@Injectable()
export class CrmCopyRefresh implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(CrmCopyRefresh.name);
  private readonly ticker = new Ticker({
    name: CrmCopyRefresh.name, ...TIMING, run: () => this.runOnce(),
  });

  constructor(@Inject(TemplateVerifier) private readonly verifier: TemplateVerifier) {}

  onApplicationBootstrap(): void {
    this.ticker.start();
  }

  onModuleDestroy(): void {
    this.ticker.stop();
  }

  /** The crm lines read ([] on a failure, logged). */
  async runOnce(now: Date = new Date()): Promise<WaLine[]> {
    return this.verifier.refreshCrmCopies(now).catch((e: unknown) => {
      this.log.warn(`crm template copies not refreshed: ${said(e)}`);
      return [];
    });
  }
}
