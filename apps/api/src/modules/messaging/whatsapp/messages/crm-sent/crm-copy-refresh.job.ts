import type { WaLine } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Ticker, TickerJob } from '@/common/jobs';
import { BackgroundJob } from '@/config/role/background-job';
import { TemplateVerifier } from '@/modules/messaging/whatsapp/templates/sync/template-verifier';

/** Not at boot (every API test boots AppModule): minutes after the worker starts, then daily. */
const TIMING = { firstMs: 5 * 60_000, everyMs: 24 * 60 * 60_000 };
const said = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** One templates GET per crm line per run via the template sync; statuses untouched. */
@BackgroundJob({ name: 'crm-template-copy' })
@Injectable()
export class CrmCopyRefresh extends TickerJob {
  private readonly log = new Logger(CrmCopyRefresh.name);
  protected readonly ticker = new Ticker({
    name: CrmCopyRefresh.name, ...TIMING, run: () => this.runOnce(),
  });

  constructor(@Inject(TemplateVerifier) private readonly verifier: TemplateVerifier) {
    super();
  }

  /** The crm lines read ([] on a failure, logged). */
  async runOnce(now: Date = new Date()): Promise<WaLine[]> {
    return this.verifier.refreshCrmCopies(now).catch((e: unknown) => {
      this.log.warn(`crm template copies not refreshed: ${said(e)}`);
      return [];
    });
  }
}
