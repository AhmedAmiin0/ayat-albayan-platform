import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { LastSeenInterceptor } from './last-seen.interceptor';
import type { LastSeenService } from './last-seen.service';

const ctx = (type: string, user?: { id: string }) =>
  ({
    getType: () => type,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;
const next: CallHandler = { handle: () => of('body') };

describe('LastSeenInterceptor', () => {
  const seen = vi.fn();
  const interceptor = new LastSeenInterceptor({ seen } as unknown as LastSeenService);

  it('hands the signed-in user to the throttled service and passes the response through', () => {
    let body: unknown;
    interceptor.intercept(ctx('http', { id: 'u1' }), next).subscribe((b) => (body = b));
    expect(seen).toHaveBeenCalledWith('u1');
    expect(body).toBe('body');
  });

  it('skips a request without a user (public routes) and non-http contexts', () => {
    seen.mockClear();
    interceptor.intercept(ctx('http'), next).subscribe();
    interceptor.intercept(ctx('rpc', { id: 'u1' }), next).subscribe();
    expect(seen).not.toHaveBeenCalled();
  });
});
