import { WA_LINES, type TemplateHealthView, type TemplateLineSync, type WaLine } from '@ab/shared';
import {
  Inject, Injectable, Logger, Optional,
  type OnApplicationBootstrap, type OnModuleDestroy, type OnModuleInit,
} from '@nestjs/common';
import { onLineSaved, type LineSaved } from '@/common/configuration/integrations/provider-saved';
import { Ticker } from '@/common/jobs';
import { BackgroundJob } from '@/config/role/background-job';
import {
  onCrm, requireLine, requireSync, syncOn,
} from '@/modules/messaging/whatsapp/templates/catalog/template-env';
import { CRM_MANAGED } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { TemplateRegistry } from '@/modules/messaging/whatsapp/templates/catalog/template.registry';
import { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import { refreshCrmCopies, rememberSync, syncLine } from './template-line-sync';
import { CrmCopiesRepo } from '@/modules/messaging/whatsapp/messages/crm-sent/crm-copies.repo';
import {
  WHATSAPP_LINES, type WhatsappLines,
} from '@/modules/messaging/whatsapp/whatsapp.types';

/** Soon after boot, not at once: the e2e stub may still be starting. One run, no interval. */
const BOOT_CHECK = { firstMs: 5_000 };
const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));
/** A save as meta or crm (docs/39), with the sync on, triggers one. */
const SYNCED_ON_SAVE: ReadonlySet<string> = new Set(['meta', 'crm']);
const wantsSync = (saved: LineSaved): boolean => SYNCED_ON_SAVE.has(saved.provider) && syncOn();
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
export class TemplateVerifier implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(TemplateVerifier.name);
  private off: (() => void) | null = null;
  private readonly ticker = new Ticker({
    name: TemplateVerifier.name, ...BOOT_CHECK, run: () => this.bootCheck(),
  });

  constructor(
    private readonly queries: TemplatesRepo,
    @Inject(WHATSAPP_LINES) private readonly lines: WhatsappLines,
    private readonly catalog: TemplateRegistry,
    @Optional() @Inject(CrmCopiesRepo) private readonly copies?: CrmCopiesRepo,
  ) {}

  /** Request-driven (not a job): the API process that saved the line runs the sync. */
  onModuleInit(): void {
    this.off = onLineSaved((saved) => this.afterSave(saved));
  }

  onApplicationBootstrap(): void {
    if (!this.configuredLines().length || !syncOn()) return;
    this.ticker.start();
  }

  onModuleDestroy(): void {
    this.ticker.stop();
    this.off?.();
  }

  /**
   * A line saved as meta (docs/19 «CRM → Meta») or crm (docs/39) syncs once, so its keys read
   * the statuses by the names they go as; any other driver, the sync off or the line not
   * configured: nothing.
   */
  async afterSave(saved: LineSaved): Promise<void> {
    if (!wantsSync(saved) || !this.lines[saved.line].configured()) return;
    const { lines } = await this.verifyAll({ line: saved.line });
    const failed = lines.filter(failedLine).map((l) => l.error ?? 'error');
    const tail = failed.length ? ` (failed: ${failed.join(', ')})` : '';
    this.log.log(`${saved.line} saved as ${saved.provider}: templates synced${tail}`);
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
    const deps = { queries: this.queries, lines: this.lines, log: this.log, copies: this.copies };
    const results: TemplateLineSync[] = [];
    for (const line of targets) {
      const result = await syncLine(deps, line, now);
      await rememberSync(deps, result);
      results.push(result);
    }
    return { lines: results, templates: await this.catalog.list() };
  }

  /** Each configured crm line's template text kept as our copy (CrmCopyRefresh); lines read. */
  async refreshCrmCopies(now: Date = new Date()): Promise<WaLine[]> {
    const deps = { queries: this.queries, lines: this.lines, log: this.log, copies: this.copies };
    const crm = this.configuredLines().filter(onCrm);
    for (const line of crm) await refreshCrmCopies(deps, line, now);
    return crm;
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
