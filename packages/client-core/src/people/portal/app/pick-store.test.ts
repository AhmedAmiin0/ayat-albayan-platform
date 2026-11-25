import { describe, expect, it, vi } from 'vitest';
import { PICKED_CHILD_KEY, pickStore, savedFor } from './pick-store';

const phone = (saved: string | null) => {
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
const mine = { profileId: 'g1', studentId: 's2' };

describe('pickStore', () => {
  it('not ready until a reader subscribes and the saved pick is read, once', async () => {
    const { storage } = phone(JSON.stringify(mine));
    const store = pickStore(storage);
    expect(store.current()).toEqual({ ready: false, saved: null });
    const listener = vi.fn();
    const off = store.subscribe(listener);
    store.subscribe(() => undefined);
    await vi.waitFor(() => expect(store.current()).toEqual({ ready: true, saved: mine }));
    expect(listener).toHaveBeenCalled();
    expect(storage.getItem).toHaveBeenCalledTimes(1);
    off();
  });

  it('a pick shows at once and is saved; one made before the read wins', async () => {
    const { storage, box } = phone(JSON.stringify(mine));
    const store = pickStore(storage);
    const other = { profileId: 'g1', studentId: 's1' };
    store.pick(other);
    expect(store.current().saved).toEqual(other);
    await vi.waitFor(() => expect(box.value).toBe(JSON.stringify(other)));
    expect(store.current()).toEqual({ ready: true, saved: other });
    expect(storage.setItem).toHaveBeenCalledWith(PICKED_CHILD_KEY, JSON.stringify(other));
  });

  it('an unreadable phone or a broken value: ready, no pick', async () => {
    const broken = pickStore({
      getItem: async () => Promise.reject(new Error('no storage')),
      setItem: async () => Promise.reject(new Error('no storage')),
    });
    broken.subscribe(() => undefined);
    await vi.waitFor(() => expect(broken.current()).toEqual({ ready: true, saved: null }));
    broken.pick(mine);
    expect(broken.current().saved).toEqual(mine);
    for (const raw of ['{', '{"profileId":1}', null]) {
      const store = pickStore(phone(raw).storage);
      store.subscribe(() => undefined);
      await vi.waitFor(() => expect(store.current()).toEqual({ ready: true, saved: null }));
    }
  });
});

describe('savedFor', () => {
  it("this profile's pick only; not ready while the profile is unknown", () => {
    const state = { ready: true, saved: mine };
    expect(savedFor(state, 'g1')).toEqual({ savedId: 's2', ready: true });
    expect(savedFor(state, 'g9')).toEqual({ savedId: null, ready: true });
    expect(savedFor(state, '')).toEqual({ savedId: null, ready: false });
    expect(savedFor({ ready: false, saved: null }, 'g1')).toEqual({ savedId: null, ready: false });
  });
});
