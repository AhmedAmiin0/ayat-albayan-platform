import type { ForwardResult, ForwardSkip, ThreadForward } from '@ab/shared';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import type { SalesScope } from '@/modules/sales/sales';
import type { ThreadMessageRow } from '@/modules/messaging/whatsapp';
import { ForwardFiles, type ForwardFile } from './forward-files';
import type { Sent } from '@/modules/messaging/inbox/send/outbox';
import { visibleToSales } from '@/modules/messaging/inbox/sales-threads/sales-threads';
import type { TeacherScope } from '@/modules/messaging/inbox/teacher-threads/teacher-scope';
import { ThreadSendService } from '@/modules/messaging/inbox/send/thread-send.service';
import { ThreadMessagesRepo } from '@/modules/messaging/inbox/threads/store';
import { httpError } from '@/common/http/errors';

interface ForwardInput {
  input: ThreadForward;
  actorId: string;
  scope: TeacherScope | null;
  sales: SalesScope | null;
}

/** One target's outcome, with the row it queued (the controller audits the new ones). */
export type ForwardOutcome = ForwardResult & { replayed?: boolean };

const SEND_REFUSALS = [
  'session_closed',
  'not_your_thread',
  'own_thread_read_only',
  'line_not_configured',
  'files_forbidden',
] as const satisfies readonly ForwardSkip[];
const sendRefusalSchema = z.enum(SEND_REFUSALS);
const refusalBody = z.object({ code: sendRefusalSchema });

/**
 * A send path refusal → the target's reason. Any other error (a DB or outbox failure) is that
 * target's `send_failed` too: the targets before it are already queued, so the forward still
 * answers and is audited.
 */
export function skipOf(e: unknown): ForwardSkip {
  if (!(e instanceof HttpException)) return 'send_failed';
  const body = refusalBody.safeParse(e.getResponse());
  return body.success ? body.data.code : 'send_failed';
}

/**
 * 404 for a message the actor cannot read (never reveal another chat), 400 for a template or an
 * empty row.
 */
function assertForwardable(
  row: ThreadMessageRow | null,
  who: Omit<ForwardInput, 'input' | 'actorId'>,
): ThreadMessageRow {
  if (!row || hiddenFrom(row, who)) throw httpError(HttpStatus.NOT_FOUND, 'message_not_found');
  if (nothingToCopy(row)) throw httpError(HttpStatus.BAD_REQUEST, 'not_forwardable');
  return row;
}

type Reader = Omit<ForwardInput, 'input' | 'actorId'>;

const outsideTeacher = (row: ThreadMessageRow, who: Reader): boolean =>
  who.scope !== null && !who.scope.phones.has(row.phone_e164);

const outsideSales = (row: ThreadMessageRow, who: Reader): boolean =>
  who.sales !== null && !visibleToSales(row);

const hiddenFrom = (row: ThreadMessageRow, who: Reader): boolean =>
  outsideTeacher(row, who) || outsideSales(row, who);

const nothingToCopy = (row: ThreadMessageRow): boolean =>
  row.template_key !== null || row.hidden_at !== null || (!row.body?.trim() && !row.media_mime);

/** Refusing targets are skipped; the dedup key carries the phone so retries are idempotent. */
@Injectable()
export class ThreadForwardService {
  private readonly log = new Logger(ThreadForwardService.name);

  constructor(
    private readonly queries: ThreadMessagesRepo,
    private readonly sends: ThreadSendService,
    private readonly files: ForwardFiles,
  ) {}

  async forward(f: ForwardInput): Promise<{ source: ThreadMessageRow; results: ForwardOutcome[] }> {
    const source = assertForwardable(await this.queries.get(f.input.messageId), f);
    const media = source.media_mime;
    // A teacher never sends files: every target is skipped, nothing is copied.
    const file =
      media && !f.scope
        ? await this.files.copy(source, { actorId: f.actorId, requestId: f.input.clientRequestId })
        : null;
    const results: ForwardOutcome[] = [];
    for (const phone of f.input.targets) results.push(await this.one({ f, source, phone, file }));
    return { source, results };
  }

  private async one(t: {
    f: ForwardInput;
    source: ThreadMessageRow;
    phone: string;
    file: ForwardFile | null;
  }): Promise<ForwardOutcome> {
    const { f, source, phone } = t;
    try {
      const sent = await this.sendTo({
        ...t,
        base: {
          phone,
          actorId: f.actorId,
          scope: f.scope,
          sales: f.sales,
          forwardedFrom: source.id,
        },
      });
      // The outbox answers a driver refusal as a `failed` row: that family never got the copy.
      if (sent.view.status === 'failed') return { phone, sent: false, reason: 'send_failed' };
      return { phone, sent: true, message_id: sent.view.id, replayed: sent.replayed };
    } catch (e) {
      if (!(e instanceof HttpException))
        this.log.error(
          `forward to one target failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      return { phone, sent: false, reason: skipOf(e) };
    }
  }

  private sendTo(t: {
    f: ForwardInput;
    source: ThreadMessageRow;
    file: ForwardFile | null;
    base: SendBase;
  }): Promise<Sent> {
    const clientRequestId = t.f.input.clientRequestId;
    if (t.source.media_mime) {
      if (!t.file) throw httpError(HttpStatus.FORBIDDEN, 'files_forbidden');
      return this.files.send({ ...t.base, input: { clientRequestId } }, t.file);
    }
    return this.sends.text({
      ...t.base,
      input: { text: t.source.body?.trim() ?? '', clientRequestId },
    });
  }
}

interface SendBase {
  phone: string;
  actorId: string;
  scope: TeacherScope | null;
  sales: SalesScope | null;
  forwardedFrom: string;
}
