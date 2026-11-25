import { describe, expect, it, vi } from 'vitest';
import { SEEN_REPORTS_KEY } from '../report-seen';
import { seenStore } from './seen-store';

const memory = (saved: string | null) => {
  const box = { value: saved };
  return {
    box,
    storage: {
      getItem: vi.fn(async () => box.value),
      setItem: vi.fn(async (_key: string, value: string) => {
        box.value = value;
      }),
    },
  };
};

describe('seenStore', () => {
  it('reads the saved ids once a reader subscribes, then tells every reader', async () => {
    const { storage } = memory('["r1"]');
    const store = seenStore(storage);
    const listener = vi.fn();
    expect(store.current()).toEqual([]);
    const off = store.subscribe(listener);
    store.subscribe(() => undefined);
    await vi.waitFor(() => expect(store.current()).toEqual(['r1']));
    expect(listener).toHaveBeenCalled();
    expect(storage.getItem).toHaveBeenCalledTimes(1);
    off();
  });

  it('a mark shows at once and is saved; one made before the read stays', async () => {
    const { storage, box } = memory('["r1"]');
    const store = seenStore(storage);
    store.mark('r2');
    expect(store.current()).toEqual(['r2']);
    store.subscribe(() => undefined);
    await vi.waitFor(() => expect(store.current()).toEqual(['r1', 'r2']));
    store.mark('r3');
    await vi.waitFor(() => expect(box.value).toBe('["r1","r2","r3"]'));
    expect(storage.setItem).toHaveBeenLastCalledWith(SEEN_REPORTS_KEY, '["r1","r2","r3"]');
  });

  it('an unreadable device keeps this run only', async () => {
    const store = seenStore({
      getItem: async () => Promise.reject(new Error('no storage')),
      setItem: async () => Promise.reject(new Error('no storage')),
    });
    store.subscribe(() => undefined);
    store.mark('r1');
    await Promise.resolve();
    expect(store.current()).toEqual(['r1']);
  });
});
