import { describe, expect, it } from 'vitest';
import { chatLiveKey } from './inbox-live.js';
import { createLiveRegistry } from './live-registry.js';

const chat = chatLiveKey('+966500000001');

describe('what is on screen', () => {
  it('a watched key refreshes; a never-watched chat does not and is not remembered', () => {
    const r = createLiveRegistry();
    expect(r.route(chat)).toBe(false);
    expect(r.watch(chat)).toBe(false); // opened later: it loads fresh by itself
    expect(r.route(chat)).toBe(true);
    expect(r.route('badge')).toBe(true);
  });

  it('a seen key under another screen is marked dirty and refreshes once when back', () => {
    const r = createLiveRegistry();
    r.watch('list');
    r.unwatch('list');
    expect(r.route('list')).toBe(false);
    expect(r.route('list')).toBe(false);
    expect(r.watch('list')).toBe(true);
    r.unwatch('list');
    expect(r.watch('list')).toBe(false);
  });

  it('forget (unmount) clears a dirty mark; a key watched twice stays watched until both release', () => {
    const r = createLiveRegistry();
    r.watch(chat);
    r.unwatch(chat);
    r.route(chat);
    r.forget(chat);
    expect(r.watch(chat)).toBe(false);
    r.watch(chat);
    r.unwatch(chat);
    expect(r.watched()).toEqual([chat]);
    r.unwatch(chat);
    expect(r.watched()).toEqual([]);
  });
});
