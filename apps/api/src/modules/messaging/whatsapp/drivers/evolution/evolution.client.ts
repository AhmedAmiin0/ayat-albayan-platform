import type { EvolutionMode } from '@ab/shared';
import { recipientAllowed, type EvolutionLineEnv } from '@/config/env/env';
import type { FetchLike } from '@/common/infra/http/failure';
import { documentHeader } from '@/modules/messaging/whatsapp/messages/wa-components';
import { wabaTemplate } from '@/modules/messaging/whatsapp/drivers/waba/waba-template';
import {
  WaError, type MediaSend, type MetaTemplate, type TemplateSend, type WaSent, type WhatsappClient,
} from '@/modules/messaging/whatsapp/whatsapp.types';
import { mediaSend, templateSend, textSend, withOptions, type EvolutionSend } from './evolution-body';
import { evolutionHttp, evolutionPath, type EvolutionConn } from './evolution-http';
import { evolutionMedia } from './evolution-media';
import { evolutionPacer, type EvolutionPacer } from './evolution-pacer';
import { evolutionUnsupported, notAllowed } from './evolution-refusals';
import { sentSchema } from './evolution-shapes';
import { templateAsText } from './evolution-template-text';

export { evolutionAutoOff } from './evolution-refusals';

// The Evolution driver (docs/19 «Evolution driver»): a number on a self-hosted Evolution API
// instance. Baileys (WhatsApp Web): no 24 h window and no templates (a template goes as text),
// paced per number, automatic sends off unless the admin allows them. Cloud: Meta's own rules.

interface EvolutionClientOpts {
  fetch?: FetchLike;
  timeoutMs?: number;
  allowed?: readonly string[] | null;
  pacer?: EvolutionPacer;
}

const DEFAULT_TIMEOUT_MS = 20_000;
const AFTER_DELAY_MS = 15_000;
/** The send deadline (Evolution waits `delay`, typing shown, inside the call): ≥ delay + 15 s. */
export const sendTimeoutMs = (env: Pick<EvolutionLineEnv, 'delayMs'>): number =>
  Math.max(DEFAULT_TIMEOUT_MS, env.delayMs + AFTER_DELAY_MS);

/** The connection of a configured client (the fetch only when a test passes one). */
const connOf = (env: EvolutionLineEnv, opts: EvolutionClientOpts): EvolutionConn => ({
  env,
  timeoutMs: opts.timeoutMs ?? sendTimeoutMs(env),
  ...(opts.fetch ? { fetch: opts.fetch } : {}),
});

/** One pacing slot per instance of one Evolution server. */
const paceKey = (env: EvolutionLineEnv): string => `${env.base}|${env.instance}`;

type TemplateWay = (c: EvolutionWhatsappClient, input: TemplateSend) => Promise<WaSent>;

/** A template per engine: rendered as text on Baileys, passed through on Cloud. */
const TEMPLATE: Record<EvolutionMode, TemplateWay> = {
  baileys: (c, input) => c.asText(input),
  cloud: (c, input) => c.post(input.to, () => templateSend(input.to, wabaTemplate(input))),
};

export class EvolutionWhatsappClient implements WhatsappClient {
  private readonly conn: EvolutionConn | null;
  private readonly allowed: readonly string[] | null;
  private readonly pacer: EvolutionPacer;

  constructor(env: EvolutionLineEnv | null, opts: EvolutionClientOpts = {}) {
    this.conn = env ? connOf(env, opts) : null;
    this.allowed = opts.allowed ?? null;
    this.pacer = opts.pacer ?? evolutionPacer;
  }

  configured(): boolean {
    return this.conn !== null;
  }

  sendTemplate(input: TemplateSend): Promise<WaSent> {
    return TEMPLATE[this.connection().env.mode](this, input);
  }

  /** Baileys with automatic sends off: staff chat messages only (the dispatch refuses the rest). */
  automaticOff(): boolean {
    const env = this.conn?.env;
    return env?.mode === 'baileys' && !env.autoSends;
  }

  sendText(input: { to: string; text: string; replyTo?: string | null }): Promise<WaSent> {
    return this.post(input.to, () => textSend(input));
  }

  sendDocument(input: MediaSend): Promise<WaSent> {
    return this.post(input.to, () => mediaSend(input));
  }

  /** Evolution's read receipt needs the chat jid beside the id; the family's ticks stay theirs. */
  markRead(): Promise<void> {
    this.connection();
    return Promise.resolve();
  }

  getTemplates(): Promise<MetaTemplate[]> {
    return Promise.reject(evolutionUnsupported('the template list'));
  }

  submitTemplate(): Promise<{ metaId: string; status: string }> {
    return Promise.reject(evolutionUnsupported('template submit'));
  }

  canUploadSamples(): boolean {
    return false;
  }

  uploadSample(): Promise<string> {
    return Promise.reject(evolutionUnsupported('sample upload'));
  }

  getMedia(mediaId: string): Promise<{ bytes: Uint8Array; mime: string }> {
    return evolutionMedia(this.connection(), mediaId);
  }

  /** Baileys: the row's text (a document header goes as the file, the text its caption). */
  asText(input: TemplateSend): Promise<WaSent> {
    const text = templateAsText(input);
    const doc = documentHeader(input);
    const send = doc
      ? () => mediaSend({ to: input.to, url: doc.link, filename: doc.filename, caption: text })
      : () => textSend({ to: input.to, text });
    return this.post(input.to, send).then((sent) => ({ ...sent, asText: true }));
  }

  /**
   * Baileys: how long `to` must wait (the sender reschedules the row, never sleeps) and the
   * number's daily cap. Cloud: Meta's own limits, no pacing.
   */
  pace(to: string): { waitMs: number; dailyCap: number; gapMs: number } | null {
    const env = this.conn?.env;
    if (env?.mode !== 'baileys') return null;
    const waitMs = this.pacer.waitMs({ key: paceKey(env), to, gapMs: env.gapMs });
    return { waitMs, dailyCap: env.dailyCap, gapMs: env.gapMs };
  }

  /** The allow-list, then one call (the pace slot taken first); the message id or `uncertain`. */
  async post(to: string, build: () => EvolutionSend): Promise<WaSent> {
    const c = this.connection();
    if (!recipientAllowed(this.allowed, to)) throw notAllowed();
    const send = withOptions(build(), c.env);
    this.pacer.mark({ key: paceKey(c.env), to });
    const path = evolutionPath(c.env, send.path);
    const json = send.body;
    const sent = await evolutionHttp(c, true).json({ path, method: 'POST', json, schema: sentSchema });
    return { waMessageId: sent.key.id };
  }

  private connection(): EvolutionConn {
    if (!this.conn) throw new WaError('WhatsApp is not configured', { code: null, status: 0 });
    return this.conn;
  }
}
