import { Logger } from '@nestjs/common';
import { channel } from 'node:diagnostics_channel';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONNECTED_CHANNEL } from '@/common/infra/http/connections';
import { dueMessage } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { SendClock } from './send-clock';
import { sendKind, sendLine } from './send-log';

// docs/42 42-2: one `wa_send` line per provider call: ids, line, kind and times; never a secret.

const TEXT = dueMessage({ template_key: null, body: 'سرّي جدًا', created_at: '2026-11-07T08:00:00Z' });

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function lines(spy: { mock: { calls: unknown[][] } }): Record<string, unknown>[] {
  return spy.mock.calls.map((call) => JSON.parse(String(call[0])) as Record<string, unknown>);
}

describe('wa_send log', () => {
  it('kind: template, media, interactive, else text', () => {
    expect(sendKind(dueMessage())).toBe('template');
    expect(sendKind({ ...TEXT, media_path: 'out/a.pdf' })).toBe('media');
    expect(sendKind({ ...TEXT, interactive_payload: { type: 'reaction' } })).toBe('interactive');
    expect(sendKind(TEXT)).toBe('text');
  });

  it('the line carries exactly the agreed fields', () => {
    const t = {
      id: 'm1', line: 'chat' as const, kind: 'text' as const, queue_ms: 5, provider_ms: 1500,
      record_ms: 40, outcome: 'sent' as const, new_conns: 0,
    };
    expect(JSON.parse(sendLine(t))).toEqual({ evt: 'wa_send', ...t });
  });

  it('a sent row: provider, record and queue times; no phone, body or params in the line', async () => {
    vi.useFakeTimers({ now: Date.parse('2026-11-07T08:00:02Z'), toFake: ['Date'] });
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const clock = new SendClock({ row: TEXT, line: 'chat' });
    await clock.provider(() => {
      channel(CONNECTED_CHANNEL).publish({});
      return Promise.resolve({ waMessageId: 'wamid.1' });
    });
    await clock.record(() => Promise.resolve(true));
    expect(clock.end('sent')).toBe('sent');
    const [line] = lines(log);
    expect(line).toMatchObject({ evt: 'wa_send', id: TEXT.id, line: 'chat', kind: 'text', queue_ms: 2000 });
    expect(line).toMatchObject({ outcome: 'sent', new_conns: 1 });
    expect(typeof line?.provider_ms).toBe('number');
    expect(typeof line?.record_ms).toBe('number');
    const raw = String(log.mock.calls[0]?.[0]);
    expect(raw).not.toContain(TEXT.phone_e164);
    expect(raw).not.toContain('سرّي');
    expect(raw).not.toContain('wamid');
  });

  it('a refused send: the outcome, no record time; the provider error still propagates', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const clock = new SendClock({ row: dueMessage(), line: 'notifications' });
    await expect(clock.provider(() => Promise.reject(new Error('131047')))).rejects.toThrow('131047');
    clock.end('failed');
    expect(lines(log)[0]).toMatchObject({ kind: 'template', outcome: 'failed', record_ms: null, queue_ms: null });
  });
});
