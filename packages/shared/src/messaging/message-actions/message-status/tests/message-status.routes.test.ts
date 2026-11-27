import { describe, expect, it } from 'vitest';
import { messageViewSchema } from '../../../chat/message-view';
import { messageStatusRoutes as routes } from '..';

const ID = '6f1c2a40-0b7e-4c2f-9d1a-3e5b7c9d1f20';
const WRITES = [routes.retry, routes.sentManually, routes.appSend, routes.handOff];

describe('messageStatusRoutes', () => {
  it('keeps the paths of today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /messages/gate',
      'POST /messages/:id/retry',
      'POST /messages/:id/sent-manually',
      'POST /messages/:id/app-send',
      'POST /messages/:id/hand-off',
    ]);
  });

  it('lets a reader see the gate and only a manager change a message, all tagged messaging', () => {
    expect(routes.gate.permissions).toEqual(['messages.read']);
    expect(new Set(WRITES.flatMap((r) => r.permissions))).toEqual(new Set(['messages.manage']));
    expect(new Set(Object.values(routes).flatMap((r) => r.tags))).toEqual(new Set(['messaging']));
  });

  it('takes a uuid id on every write', () => {
    expect(WRITES.filter((r) => r.params.safeParse({ id: 'x' }).success)).toEqual([]);
    expect(routes.retry.params.parse({ id: ID })).toEqual({ id: ID });
  });

  it('answers every write with the message row as it is now', () => {
    expect(WRITES.filter((r) => r.response !== messageViewSchema)).toEqual([]);
  });

  it('answers the gate with its reason and queue, refusing an unknown reason', () => {
    const closed = { open: false, reason: 'switch_off', queued: 3 };
    const open = { open: true, reason: null, queued: 0, restricted: true };
    expect([closed, open].map((v) => routes.gate.response.parse(v))).toEqual([closed, open]);
    const bad = [{ ...closed, reason: 'env_off' }, { ...closed, queued: -1 }, { open: true }];
    expect(bad.filter((v) => routes.gate.response.safeParse(v).success)).toEqual([]);
  });
});
