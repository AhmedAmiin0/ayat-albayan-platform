import type { ErrorReporter } from '@ab/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { withRequestId } from './request-id';
import { ReportingLogger } from './reporting.logger';

afterEach(() => vi.restoreAllMocks());

function reporter(enabled: boolean) {
  return { enabled, capture: vi.fn<ErrorReporter['capture']>() };
}

describe('ReportingLogger (error lines also go to the error tracker, when one is set)', () => {
  it('tracker off: logs as before and reports nothing', () => {
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const r = reporter(false);
    new ReportingLogger(r).error('run aborted: db down', undefined, 'RemindersJob');
    expect(r.capture).not.toHaveBeenCalled();
  });

  it('tracker on: the message, its stack and the request id', () => {
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const r = reporter(true);
    const stack = 'Error: boom\n    at handler (a.ts:1:1)';
    withRequestId('req-9', () => new ReportingLogger(r).error('boom', stack, 'ExceptionsHandler'));
    const [error, tags] = r.capture.mock.calls[0] ?? [];
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('boom');
    expect((error as Error).stack).toBe(stack);
    expect(tags).toEqual({ request_id: 'req-9', context: 'ExceptionsHandler' });
  });

  it('an Error logged as such is reported as itself; a job line has no request id', () => {
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const r = reporter(true);
    const e = new TypeError('bad');
    new ReportingLogger(r).error(e);
    expect(r.capture).toHaveBeenCalledWith(e, {});
  });

  it('a job line (message, context): the context is a tag, never taken for a stack', () => {
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const r = reporter(true);
    new ReportingLogger(r).error('run aborted: db down', 'RemindersJob');
    const [error, tags] = r.capture.mock.calls[0] ?? [];
    expect((error as Error).stack).not.toBe('RemindersJob');
    expect(tags).toEqual({ context: 'RemindersJob' });
  });

  it('a job’s error line is recorded on its heartbeat, tracker on or off', () => {
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const beats = { failLogged: vi.fn() };
    new ReportingLogger(reporter(false), beats).error('recurring expenses failed: db down', 'ExpensesJob');
    expect(beats.failLogged).toHaveBeenCalledWith('ExpensesJob', 'recurring expenses failed: db down');
  });

  it('warnings and info never reach the tracker', () => {
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const r = reporter(true);
    const log = new ReportingLogger(r);
    log.warn('slow');
    log.log('fine');
    expect(r.capture).not.toHaveBeenCalled();
  });
});
