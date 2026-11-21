import { afterEach, describe, expect, it, vi } from 'vitest';
import { withRequestId } from './request-id';
import { RequestIdLogger } from './request-id.logger';

afterEach(() => vi.restoreAllMocks());

function lines(): string[] {
  const out: string[] = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    // Colours off: the plain text of the line.
    const parts = String(chunk).split('\u001b');
    out.push(parts.map((p, i) => (i === 0 ? p : p.replace(/^\[\d+m/, ''))).join(''));
    return true;
  });
  return out;
}

describe('RequestIdLogger (every log line of a request carries its id)', () => {
  it('inside a request: [req:<id>] after the context', () => {
    const out = lines();
    const logger = new RequestIdLogger();
    withRequestId('abc-123', () => logger.log('sent', 'Outbox'));
    expect(out.join('')).toContain('[Outbox] [req:abc-123] sent');
  });

  it('outside a request (a job, the boot): exactly as before', () => {
    const out = lines();
    new RequestIdLogger().log('tick', 'RemindersJob');
    expect(out.join('')).toContain('[RemindersJob] tick');
    expect(out.join('')).not.toContain('req:');
  });

  it('a line without a context still gets the id', () => {
    const out = lines();
    withRequestId('abc-123', () => new RequestIdLogger().log('plain'));
    expect(out.join('')).toContain('[req:abc-123] plain');
  });
});
