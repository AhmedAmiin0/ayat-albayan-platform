import { HttpStatus } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { messageRow } from '../whatsapp/sender.fakes';
import { waHttpError } from '../whatsapp/template.mapper';
import type { ForwardFiles } from './forward-files';
import type { Sent } from './outbox';
import { allReplayed, forwardAudit, freshResults } from './thread-forward.controller';
import { skipOf, ThreadForwardService, type ForwardOutcome } from './thread-forward.service';
import type { ThreadSendService } from './thread-send.service';
import type { ThreadsQueries } from './threads.queries';

const SRC = 'a0000000-0000-4000-8000-0000000000f1';
const A = '+966500000001';
const B = '+966500000002';
const C = '+966500000003';
const src = messageRow({ id: SRC, direction: 'inbound', body: 'نص', template_key: null, template_params: null, media_mime: null });
const sent = (status: Sent['view']['status'], id: string): Sent => ({ view: { id, status } as Sent['view'], replayed: false });

function service(text: (phone: string) => Promise<Sent>) {
  const queries = { get: vi.fn(async () => src) } as unknown as ThreadsQueries;
  const sends = { text: vi.fn(async (s: { phone: string }) => text(s.phone)) } as unknown as ThreadSendService;
  return new ThreadForwardService(queries, sends, {} as ForwardFiles);
}
const input = { messageId: SRC, targets: [A, B, C], clientRequestId: 'c0000000-0000-4000-8000-000000000003' };
const run = (svc: ThreadForwardService) => svc.forward({ input, actorId: 'admin-1', scope: null, sales: null });

describe('skipOf', () => {
  it('maps a known refusal code to its reason, any other HTTP code and any other error to send_failed', () => {
    expect(skipOf(waHttpError('session_closed', HttpStatus.CONFLICT))).toBe('session_closed');
    expect(skipOf(waHttpError('invalid_param', 422))).toBe('send_failed');
    expect(skipOf(new Error('db down'))).toBe('send_failed');
  });
});

describe('ThreadForwardService.forward', () => {
  it('a row the driver refused (failed) is send_failed, never counted as sent', async () => {
    const { results } = await run(service(async (p) => sent(p === B ? 'failed' : 'sent', `m-${p}`)));
    expect(results).toEqual([
      { phone: A, sent: true, message_id: `m-${A}`, replayed: false },
      { phone: B, sent: false, reason: 'send_failed' },
      { phone: C, sent: true, message_id: `m-${C}`, replayed: false },
    ]);
  });

  it('a DB error on one target skips only it: the others still go and the request answers', async () => {
    const { results } = await run(service(async (p) => {
      if (p === B) throw new Error('outbox insert failed');
      return sent('queued', `m-${p}`);
    }));
    expect(results.map((r) => (r.sent ? 'sent' : r.reason))).toEqual(['sent', 'send_failed', 'sent']);
  });
});

describe('forward audit', () => {
  const replayed: ForwardOutcome = { phone: A, sent: true, message_id: 'm1', replayed: true };
  const fresh: ForwardOutcome = { phone: B, sent: true, message_id: 'm2', replayed: false };
  const skipped: ForwardOutcome = { phone: C, sent: false, reason: 'session_closed' };

  it('keeps only what this request did: a replayed copy was audited the first time', () => {
    expect(freshResults([replayed, fresh, skipped])).toEqual([fresh, skipped]);
    expect(forwardAudit(freshResults([replayed, fresh]))).toEqual({ sent: [{ phone: B, message_id: 'm2' }], skipped: [] });
  });

  it('a retry whose every copy already existed writes no second audit row', () => {
    expect(allReplayed([replayed])).toBe(true);
    expect(allReplayed([replayed, skipped])).toBe(false);
  });
});
