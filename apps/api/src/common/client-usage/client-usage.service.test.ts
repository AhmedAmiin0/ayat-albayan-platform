import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClientUsageService, USAGE_LOG_EVERY_MS } from './client-usage.service';

describe('ClientUsageService', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('logs one summary line every 15 minutes, then resets; quiet windows log nothing', () => {
    vi.useFakeTimers();
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const svc = new ClientUsageService();
    svc.onModuleInit();
    svc.hit({ method: 'PATCH', route: '/settings', client: 'untagged' });
    vi.advanceTimersByTime(USAGE_LOG_EVERY_MS);
    expect(log).toHaveBeenCalledExactlyOnceWith('client usage (1 hits): PATCH /settings untagged=1');
    vi.advanceTimersByTime(USAGE_LOG_EVERY_MS);
    expect(log).toHaveBeenCalledOnce();
    svc.onModuleDestroy();
  });

  it('on destroy: clears the timer and flushes the last window', () => {
    vi.useFakeTimers();
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const svc = new ClientUsageService();
    svc.onModuleInit();
    svc.hit({ method: 'GET', route: '/settings', client: 'web/1' });
    svc.onModuleDestroy();
    expect(log).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
