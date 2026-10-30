import { describe, expect, it, vi } from 'vitest';
import type { PresenceWatch } from './presence-live.js';
import { watchPresence } from './presence-watch.js';
import { fakeRealtime } from './presence.fakes.test-util.js';

const A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const last = (fn: ReturnType<typeof vi.fn>): PresenceWatch =>
  fn.mock.calls.at(-1)?.[0] as PresenceWatch;

describe('watchPresence', () => {
  it('subscribes to each topic without tracking, live once every topic joined', () => {
    const rt = fakeRealtime();
    const onChange = vi.fn();
    watchPresence(rt, { profileIds: [A, B, A], onChange });
    expect(rt.joined.map((c) => c.topic)).toEqual([`presence:${A}`, `presence:${B}`]);
    expect(rt.joined.every((c) => c.config.presence === undefined)).toBe(true);
    rt.joined[0]?.status('SUBSCRIBED');
    expect(last(onChange).live).toBe(false);
    rt.joined[1]?.status('SUBSCRIBED');
    expect(last(onChange).live).toBe(true);
    expect(rt.joined.flatMap((c) => c.tracked)).toEqual([]);
  });

  it('reports who holds a meta, and drops them when it goes', () => {
    const rt = fakeRealtime();
    const onChange = vi.fn();
    watchPresence(rt, { profileIds: [A, B], onChange });
    rt.joined[1]?.sync({ [B]: [{ at: 'x' }] });
    expect([...last(onChange).online]).toEqual([B]);
    rt.joined[1]?.sync({});
    expect([...last(onChange).online]).toEqual([]);
  });

  it('a refused join is not live', () => {
    const rt = fakeRealtime();
    const onChange = vi.fn();
    watchPresence(rt, { profileIds: [A], onChange });
    rt.joined[0]?.status('SUBSCRIBED');
    rt.joined[0]?.status('CHANNEL_ERROR');
    expect(last(onChange).live).toBe(false);
  });

  it('leaves every topic on stop and stays quiet afterwards', () => {
    const rt = fakeRealtime();
    const onChange = vi.fn();
    const stop = watchPresence(rt, { profileIds: [A, B], onChange });
    stop();
    expect(rt.removed).toHaveLength(2);
    rt.joined[0]?.status('SUBSCRIBED');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports not live when realtime throws, and watches nobody for an empty list', () => {
    const onChange = vi.fn();
    const broken = {
      ...fakeRealtime(),
      channel: () => {
        throw new Error('no socket');
      },
    };
    watchPresence(broken, { profileIds: [A], onChange });
    expect(last(onChange)).toEqual({ live: false, online: new Set() });
    const rt = fakeRealtime();
    watchPresence(rt, { profileIds: [], onChange });
    expect(rt.joined).toHaveLength(0);
  });
});
