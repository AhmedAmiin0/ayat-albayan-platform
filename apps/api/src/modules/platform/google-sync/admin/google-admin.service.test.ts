import { describe, expect, it, vi } from 'vitest';
import type { GoogleData } from '../google-data';
import type { GoogleRuntime } from '../google-runtime';
import { GoogleAdminService } from './google-admin.service';

describe('GoogleAdminService.discover', () => {
  it('re-reads the connection uncached first (a disconnect on the other API copy counts at once)', async () => {
    const order: string[] = [];
    const connection = {
      forget: vi.fn(() => order.push('forget')),
      client: vi.fn(async () => (order.push('client'), null)),
    };
    const admin = new GoogleAdminService({} as GoogleData, { connection } as unknown as GoogleRuntime);
    await expect(admin.discover()).rejects.toThrow('not_connected');
    expect(order).toEqual(['forget', 'client']);
  });
});
