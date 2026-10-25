import type { ForwardResult, ForwardSkip, ThreadForward } from '@ab/shared';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { SalesScope } from '../sales/sales-scope';
import type { ThreadMessageRow } from '../whatsapp/message.mapper';
import { waHttpError } from '../whatsapp/template.mapper';
import { ForwardFiles, type ForwardFile } from './forward-files';
import type { Sent } from './outbox';
import { visibleToSales } from './sales-threads';
import type { TeacherScope } from './teacher-scope';
import { ThreadSendService } from './thread-send.service';
import { ThreadsQueries } from './threads.queries';

export interface ForwardInput {
  input: ThreadForward;
  actorId: string;
  scope: TeacherScope | null;
  sales: SalesScope | null;
}

/** One target's outcome, with the row it queued (the controller audits the new ones). */
export type ForwardOutcome = ForwardResult & { replayed?: boolean };

const SKIPS: ReadonlySet<string> = new Set<ForwardSkip>([
  'session_closed',
  'not_your_thread',
  'own_thread_read_only',
  'line_not_configured',
  'files_forbidden',
]);

/** A send path refusal → the target's reason; anything that is not an HTTP refusal is a real error. */
export function skipOf(e: unknown): ForwardSkip {
  if (!(e instanceof HttpException)) throw e;
  const body = e.getResponse();
  const code = typeof body === 'object' && body !== null && 'code' in body ? String(body.code) : '';
  return SKIPS.has(code) ? (code as ForwardSkip) : 'send_failed';
}

/** 404 for a message the actor cannot read (never reveal another chat), 400 for a template or an empty row. */
export function assertForwardable(row: ThreadMessageRow | null, who: Omit<ForwardInput, 'input' | 'actorId'>): ThreadMessageRow {
  const hidden = !row || (who.scope && !who.scope.phones.has(row.phone_e164)) || (who.sales && !visibleToSales(row));
  if (hidden) throw waHttpError('message_not_found', HttpStatus.NOT_FOUND);
  if (row.template_key || (!row.body?.trim() && !row.media_mime)) throw waHttpError('not_forwardable', HttpStatus.BAD_REQUEST);
  return row;
}

/**
 * «إعادة توجيه» (owner 2026-10-25): one message copied to 1–5 chats, each through the normal session
 * send path (the actor's own scope, the 24 h window, the line; the sender's gates stay as they are).
 * A target that refuses is skipped with its reason; the others still go. The request id is reused
 * per target: the dedup key carries the phone, so a retried forward returns the same rows.
 */
@Injectable()
export class ThreadForwardService {
  constructor(
    private readonly queries: ThreadsQueries,
    private readonly sends: ThreadSendService,
    private readonly files: ForwardFiles,
  ) {}

  async forward(f: ForwardInput): Promise<{ source: ThreadMessageRow; results: ForwardOutcome[] }> {
    const source = assertForwardable(await this.queries.get(f.input.messageId), f);
    const media = source.media_mime;
    // A teacher never sends files (owner 2026-10-19 #5): every target is skipped, nothing is copied.
    const file = media && !f.scope ? await this.files.copy(source, { actorId: f.actorId, requestId: f.input.clientRequestId }) : null;
    const results: ForwardOutcome[] = [];
    for (const phone of f.input.targets) results.push(await this.one({ f, source, phone, file }));
    return { source, results };
  }

  private async one(t: { f: ForwardInput; source: ThreadMessageRow; phone: string; file: ForwardFile | null }): Promise<ForwardOutcome> {
    const { f, source, phone } = t;
    try {
      const sent = await this.sendTo({ ...t, base: { phone, actorId: f.actorId, scope: f.scope, sales: f.sales, forwardedFrom: source.id } });
      return { phone, sent: true, message_id: sent.view.id, replayed: sent.replayed };
    } catch (e) {
      return { phone, sent: false, reason: skipOf(e) };
    }
  }

  private sendTo(t: { f: ForwardInput; source: ThreadMessageRow; file: ForwardFile | null; base: SendBase }): Promise<Sent> {
    const clientRequestId = t.f.input.clientRequestId;
    if (t.source.media_mime) {
      if (!t.file) throw waHttpError('files_forbidden', HttpStatus.FORBIDDEN);
      return this.files.send({ ...t.base, input: { clientRequestId } }, t.file);
    }
    return this.sends.text({ ...t.base, input: { text: t.source.body?.trim() ?? '', clientRequestId } });
  }
}

type SendBase = { phone: string; actorId: string; scope: TeacherScope | null; sales: SalesScope | null; forwardedFrom: string };
