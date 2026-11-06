import { WA_ERROR, type EvolutionMode } from '@ab/shared';
import { recipientAllowed, type EvolutionLineEnv } from '@/config/env/env';
import type { FetchLike } from '@/common/infra/http/failure';
import { documentHeader } from '@/modules/messaging/whatsapp/messages/wa-components';
import { wabaTemplate } from '@/modules/messaging/whatsapp/drivers/waba/waba-template';
import {
  WaError, type MediaSend, type MetaTemplate, type TemplateSend, type WaSent, type WhatsappClient,
} from '@/modules/messaging/whatsapp/whatsapp.types';
import { mediaSend, templateSend, textSend, type EvolutionSend } from './evolution-body';
import { evolutionHttp, evolutionPath, type EvolutionConn } from './evolution-http';
import { evolutionMedia } from './evolution-media';
import { evolutionPacer, type EvolutionPacer } from './evolution-pacer';
import { sentSchema } from './evolution-shapes';
import { templateAsText } from './evolution-template-text';

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

/** What Evolution cannot do from here: the template list, submit, samples (and cloud media). */
const evolutionUnsupported = (what: string): WaError =>
  new WaError(`${what} is not supported by the Evolution driver`, {
    code: null, status: 0, unsupported: 'evolution',
  });

/** A Baileys number with automatic sends off refuses a job's row (docs/19): fails, never sent. */
export const evolutionAutoOff = (): WaError =>
  new WaError('automatic sends are off on this Baileys number', {
    code: WA_ERROR.invalidParameter, status: 0, unsupported: 'evolution', blocked: 'evolution_auto_off',
  });

const notAllowed = (): WaError =>
  new WaError('recipient not allowed', { code: WA_ERROR.recipientNotAllowed, status: 0 });

/** The connection of a configured client (the fetch only when a test passes one). */
const connOf = (env: EvolutionLineEnv, opts: EvolutionClientOpts): EvolutionConn => ({
  env,
  timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  ...(opts.fetch ? { fetch: opts.fetch } : {}),
});

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

  /** The allow-list, the Baileys pace, then one call; the message id or `uncertain`. */
  async post(to: string, build: () => EvolutionSend): Promise<WaSent> {
    const c = this.connection();
    if (!recipientAllowed(this.allowed, to)) throw notAllowed();
    const send = build();
    await this.pace(c, to);
    const path = evolutionPath(c.env, send.path);
    const sent = await evolutionHttp(c, true).json({ path, method: 'POST', json: send.body, schema: sentSchema });
    return { waMessageId: sent.key.id };
  }

  private pace(c: EvolutionConn, to: string): Promise<void> {
    const key = `${c.env.base}|${c.env.instance}`;
    const gapMs = c.env.mode === 'baileys' ? c.env.gapMs : 0;
    return this.pacer.turn(key, { to, gapMs });
  }

  private connection(): EvolutionConn {
    if (!this.conn) throw new WaError('WhatsApp is not configured', { code: null, status: 0 });
    return this.conn;
  }
}
