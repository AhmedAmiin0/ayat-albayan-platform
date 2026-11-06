import { describe, expect, it } from 'vitest';
import { PackageEvents } from './package-events';

describe('PackageEvents (owner 2026-11-06)', () => {
  it('tells every listener in order; a failing one never stops the next or throws', async () => {
    const events = new PackageEvents();
    const seen: string[] = [];
    events.onPaid(() => Promise.reject(new Error('down')));
    events.onPaid(async (id) => {
      seen.push(id);
    });
    await expect(events.paid('sub1')).resolves.toBeUndefined();
    expect(seen).toEqual(['sub1']);
  });

});
