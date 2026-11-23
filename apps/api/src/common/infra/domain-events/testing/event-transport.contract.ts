import { describe, expect, it, vi } from 'vitest';
import type { EventHandlers } from '@/common/infra/domain-events/event-handlers.types';
import type { HarnessFactory } from './event-transport.contract.types';

const PROBE = { probe_id: '0b6c1d2e-3f40-4a51-8b62-7c8d9e0f1a2b' };
const probe = { kind: 'events.probe', payload: PROBE };

const handlersOf = (probeHandler: EventHandlers['events.probe']): EventHandlers => ({
  'events.probe': probeHandler,
});

const failing = (times: number) => {
  let left = times;
  return vi.fn(() => (left-- > 0 ? Promise.reject(new Error('handler down')) : Promise.resolve()));
};

/**
 * What every EventTransport adapter must do (outbox ticker today, a queue library later). The
 * factory's retries are due at once, so each drainOnce() is one more attempt.
 */
export function eventTransportContract(name: string, make: HarnessFactory): void {
  describe(`EventTransport contract: ${name}`, () => {
    it('delivers an event once, however often it drains', async () => {
      const h = await make({ maxAttempts: 3 });
      const handler = vi.fn(() => Promise.resolve());
      const id = await h.publish(probe);
      h.transport.start(handlersOf(handler));
      await h.transport.drainOnce();
      await h.transport.drainOnce();
      await h.transport.stop();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id, payload: PROBE }));
      await expect(h.stateOf(id)).resolves.toBe('done');
    });

    it('retries a throwing handler, then delivers it once', async () => {
      const h = await make({ maxAttempts: 3 });
      const handler = failing(1);
      const id = await h.publish(probe);
      h.transport.start(handlersOf(handler));
      await h.transport.drainOnce();
      await expect(h.stateOf(id)).resolves.toBe('pending');
      await h.transport.drainOnce();
      await h.transport.drainOnce();
      await h.transport.stop();
      expect(handler).toHaveBeenCalledTimes(2);
      await expect(h.stateOf(id)).resolves.toBe('done');
    });

    it('parks a poison event after N attempts and never calls it again', async () => {
      const h = await make({ maxAttempts: 3 });
      const handler = failing(Number.POSITIVE_INFINITY);
      const id = await h.publish(probe);
      h.transport.start(handlersOf(handler));
      for (const _ of [1, 2, 3, 4, 5]) await h.transport.drainOnce();
      await h.transport.stop();
      expect(handler).toHaveBeenCalledTimes(3);
      await expect(h.stateOf(id)).resolves.toBe('parked');
    });

    it('parks an unknown kind or a bad payload without calling a handler', async () => {
      const h = await make({ maxAttempts: 3 });
      const handler = vi.fn(() => Promise.resolve());
      const unknown = await h.publish({ kind: 'lesson.nope', payload: PROBE });
      const bad = await h.publish({ kind: 'events.probe', payload: { probe_id: 'x' } });
      h.transport.start(handlersOf(handler));
      await h.transport.drainOnce();
      await h.transport.stop();
      expect(handler).not.toHaveBeenCalled();
      await expect(h.stateOf(unknown)).resolves.toBe('parked');
      await expect(h.stateOf(bad)).resolves.toBe('parked');
    });

    it('stop() resolves only after the handler in flight has finished', async () => {
      const h = await make({ maxAttempts: 3 });
      let open = (): void => undefined;
      const gate = new Promise<void>((resolve) => (open = resolve));
      const entered = vi.fn();
      const finished = vi.fn();
      const id = await h.publish(probe);
      h.transport.start(handlersOf(() => (entered(), gate.then(finished))));
      const draining = h.transport.drainOnce();
      await vi.waitFor(() => expect(entered).toHaveBeenCalled());
      let stopped = false;
      const finishedAtStop = h.transport.stop().then(() => {
        stopped = true;
        return finished.mock.calls.length;
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(stopped).toBe(false);
      open();
      await expect(finishedAtStop).resolves.toBe(1);
      await draining;
      await expect(h.stateOf(id)).resolves.toBe('done');
    });
  });
}
