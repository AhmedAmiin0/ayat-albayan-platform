import { describe, expect, it, vi } from 'vitest';
import { RESUME_KEY, resumeStore } from '.';

const memory = (saved: string | null) => ({
  getItem: vi.fn(() => Promise.resolve(saved)),
  setItem: vi.fn(() => Promise.resolve()),
});

describe('resumeStore', () => {
  it('reads the saved stops once and tells its listeners', async () => {
    const storage = memory('{"A":{"at":12,"done":false}}');
    const store = resumeStore(storage);
    const listener = vi.fn();
    store.subscribe(listener);
    await vi.waitFor(() => expect(store.current()).toEqual({ A: { at: 12, done: false } }));
    expect(listener).toHaveBeenCalled();
    expect(storage.getItem).toHaveBeenCalledTimes(1);
  });

  it('shows a save at once, then writes it after the read', async () => {
    const storage = memory(null);
    const store = resumeStore(storage);
    store.save({ id: 'B', position: 60, duration: 600 });
    expect(store.current()).toEqual({ B: { at: 60, done: false } });
    const written = () =>
      expect(storage.setItem).toHaveBeenCalledWith(RESUME_KEY, expect.any(String));
    await vi.waitFor(written);
  });

  it('keeps this run’s stops when the storage fails', async () => {
    const fail = () => Promise.reject(new Error('x'));
    const storage = { getItem: fail, setItem: fail };
    const store = resumeStore(storage);
    store.save({ id: 'C', position: 60, duration: 600 });
    await Promise.resolve();
    expect(store.current()).toEqual({ C: { at: 60, done: false } });
  });
});
