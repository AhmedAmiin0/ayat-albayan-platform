import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { httpLine, maskedWhere, reportHttp, SLOW_HTTP_MS, timed } from './http-timing';

// docs/42 42-2: the outbound timing line names the call, never a host, a query or an id.

afterEach(() => {
  vi.restoreAllMocks();
});

describe('http timing log', () => {
  it('masks id-like path segments (phone number ids, phones)', () => {
    const where = 'kapso POST /meta/whatsapp/v24.0/1234567890123/messages';
    expect(maskedWhere(where)).toBe('kapso POST /meta/whatsapp/v24.0/:id/messages');
    expect(maskedWhere('evolution POST /chat/check/+966501234567')).toBe('evolution POST /chat/check/:id');
  });

  it('the line has exactly evt, where, status and ms', () => {
    const line = JSON.parse(httpLine({ where: 'kapso POST /x/123456/messages', status: 200, ms: 12 })) as unknown;
    expect(line).toEqual({ evt: 'http', where: 'kapso POST /x/:id/messages', status: 200, ms: 12 });
  });

  it('slow calls warn, fast ones are debug', () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const debug = vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    reportHttp({ where: 'a GET /', status: 200, ms: SLOW_HTTP_MS + 1 });
    reportHttp({ where: 'a GET /', status: 200, ms: 3 });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(debug).toHaveBeenCalledTimes(1);
  });

  it('timed() logs the status it saw, and null when the call threw', async () => {
    const debug = vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    await timed('a POST /', (seen) => {
      seen(201);
      return Promise.resolve('ok');
    });
    await expect(timed('a POST /', () => Promise.reject(new Error('down')))).rejects.toThrow('down');
    const lines = debug.mock.calls.map(([line]) => JSON.parse(String(line)) as { status: unknown });
    expect(lines.map((l) => l.status)).toEqual([201, null]);
  });
});
