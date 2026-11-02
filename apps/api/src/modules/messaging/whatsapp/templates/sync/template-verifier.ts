import { WA_LINES, type TemplateHealthView, type TemplateLineSync, type WaLine } from '@ab/shared';
import {
  Inject, Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy,
} from '@nestjs/common';
import { Ticker } from '@/common/jobs';
import { BackgroundJob } from '@/config/role/background-job';
import {
  requireLine, requireSync, syncOn,
} from '@/modules/messaging/whatsapp/templates/catalog/template-env';
import { CRM_MANAGED } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { TemplateRegistry } from '@/modules/messaging/whatsapp/templates/catalog/template.registry';
import { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import { rememberSync, syncLine } from './template-line-sync';
import {
  WHATSAPP_LINES, type WhatsappLines,
} from '@/modules/messaging/whatsapp/whatsapp.types';

/** Soon after boot, not at once: the e2e stub may still be starting. One run, no interval. */
const BOOT_CHECK = { firstMs: 5_000 };
const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));
/** A crm line is not a failure: its templates live in the CRM (docs/19). */
const failedLine = (l: TemplateLineSync): boolean => !l.ok && l.error !== CRM_MANAGED;

/**
 * Each number's sync with Meta (R-MSG-01, docs/12 §3.4, owner 2026-10-18): reads only its own
 * WABA's list (read-only) for only its own rows and imports that WABA's new templates. Once after
 * boot when a line is configured (best effort: log and continue, never block, never submit), and on
 * the admin's POST /messaging/templates/health.
 */
@BackgroundJob({ name: 'template-boot-check' })
@Injectable()
export class TemplateVerifier implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(TemplateVerifier.name);
  private readonly ticker = new Ticker({
    name: TemplateVerifier.name, ...BOOT_CHECK, run: () => this.bootCheck(),
  });

  constructor(
    private readonly queries: TemplatesRepo,
    @Inject(WHATSAPP_LINES) private readonly lines: WhatsappLines,
    private readonly catalog: TemplateRegistry,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.configuredLines().length || !syncOn()) return;
    this.ticker.start();
  }

  onModuleDestroy(): void {
    this.ticker.stop();
  }

  async bootCheck(): Promise<void> {
    try {
      const { lines, templates } = await this.verifyAll();
      const notReady = templates.filter((v) => v.status !== 'approved').map((v) => `${v.key}=${v.status}`);
      const failed = lines.filter(failedLine).map((l) => `${l.line}: ${l.error ?? 'error'}`);
      this.log.log(`templates checked: ${templates.length - notReady.length} approved; ${notReady.join(', ') || 'all ready'}`);
      if (failed.length) this.log.warn(`template sync failed for ${failed.join(', ')}`);
    } catch (e) {
      this.log.warn(`boot template check skipped: ${errText(e)}`);
    }
  }

  /**
   * POST /messaging/templates/health: `line` alone, or every configured line (notifications
   * first, so the chat import sees its rows). A line whose read fails reports its error; the other
   * still syncs.
   * 503 not_configured when the asked line (or every line) is not configured.
   */
  async verifyAll(opts: { line?: WaLine; now?: Date } = {}): Promise<TemplateHealthView> {
    requireSync();
    const now = opts.now ?? new Date();
    const targets = this.targets(opts.line);
    const deps = { queries: this.queries, lines: this.lines, log: this.log };
    const results: TemplateLineSync[] = [];
    for (const line of targets) {
      const result = await syncLine(deps, line, now);
      await rememberSync(deps, result);
      results.push(result);
    }
    return { lines: results, templates: await this.catalog.list() };
  }

  /** The asked line (503 when it is not configured), else every configured line (503 when none). */
  private targets(line?: WaLine): WaLine[] {
    if (line) {
      requireLine(this.lines[line], line);
      return [line];
    }
    const all = this.configuredLines();
    if (!all.length) requireLine(this.lines.notifications, 'notifications');
    return all;
  }

  private configuredLines(): WaLine[] {
    return WA_LINES.filter((line) => this.lines[line].configured());
  }
}
