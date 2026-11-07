import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { defer, firstValueFrom, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { canFillMinioSlot, withUploadClient } from './upload-client';
import { UploadClientInterceptor } from './upload-client.interceptor';

const ctxWith = (headers: Record<string, unknown>) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) }) as unknown as ExecutionContext;

/** The handler reads the capability after an await, as a real service does. */
const handler: CallHandler = {
  handle: () => defer(async () => {
    await Promise.resolve();
    return canFillMinioSlot();
  }),
};

describe('X-AB-Upload capability (docs/45 §4 step 9)', () => {
  it('only slot-v2 counts; outside a request nothing does', () => {
    expect(withUploadClient('slot-v2', canFillMinioSlot)).toBe(true);
    expect(withUploadClient(['slot-v2', 'slot-v2'], canFillMinioSlot)).toBe(false);
    expect(withUploadClient(undefined, canFillMinioSlot)).toBe(false);
    expect(canFillMinioSlot()).toBe(false);
  });

  it('the global interceptor runs the handler inside the header’s capability', async () => {
    const i = new UploadClientInterceptor();
    const run = (headers: Record<string, unknown>) =>
      firstValueFrom(i.intercept(ctxWith(headers), handler));
    expect(await run({ 'x-ab-upload': 'slot-v2' })).toBe(true);
    expect(await run({ 'x-ab-client': 'mobile/0.4.3' })).toBe(false);
    expect(await firstValueFrom(i.intercept(ctxWith({}), { handle: () => of(1) }))).toBe(1);
  });
});
