import { describe, expect, it } from 'vitest';
import { buildEnvelope, scrub } from './envelope';

const dsn = { endpoint: 'https://e.example.com/api/1/envelope/', key: 'k', dsn: 'https://k@e.example.com/1' };

describe('buildEnvelope (one error event, no client timestamp)', () => {
  it('three JSON lines: envelope header, item header, event', () => {
    const error = new TypeError('boom');
    const body = buildEnvelope({ dsn, id: 'a'.repeat(32), report: { error, app: 'api', tags: { request_id: 'r1' } } });
    const [head, item, event] = body.trimEnd().split('\n').map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(head).toEqual({ event_id: 'a'.repeat(32), dsn: dsn.dsn });
    expect(item).toEqual({ type: 'event' });
    expect(event).toMatchObject({
      event_id: 'a'.repeat(32),
      level: 'error',
      platform: 'javascript',
      tags: { app: 'api', request_id: 'r1' },
      exception: { values: [{ type: 'TypeError', value: 'boom' }] },
    });
    expect(event).not.toHaveProperty('timestamp');
    expect(JSON.stringify(event?.extra)).toContain('TypeError: boom');
  });

  it('a thrown non-Error is reported as its text', () => {
    const body = buildEnvelope({ dsn, id: 'b'.repeat(32), report: { error: 'plain', app: 'web' } });
    expect(body).toContain('"type":"Error","value":"plain"');
  });
});

describe('scrub (no phone numbers or emails leave the device)', () => {
  it('masks numbers of 7+ digits and email addresses, keeps the rest', () => {
    expect(scrub('send to +966 50 123 4567 failed')).toBe('send to [number] failed');
    expect(scrub('user a.b@example.com not found')).toBe('user [email] not found');
    expect(scrub('lesson 42 at 10:30')).toBe('lesson 42 at 10:30');
  });

  it('cuts very long text', () => {
    expect(scrub('x'.repeat(10_000))).toHaveLength(4_000);
  });
});

describe('buildEnvelope edge cases', () => {
  it('an Error without a stack sends an empty stack', () => {
    const error = new Error('no stack');
    delete error.stack;
    const body = buildEnvelope({ dsn, id: 'c'.repeat(32), report: { error, app: 'api' } });
    expect(body).toContain('"extra":{"stack":""}');
  });
});
