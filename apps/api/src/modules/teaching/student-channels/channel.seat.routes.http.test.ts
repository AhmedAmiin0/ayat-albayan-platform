import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelApp, ST } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const seat = (id: string) => `/sales/students/${id}/channel/seat`;

describe('seat routes served from their route objects (docs/31 §2)', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(t.seats.seat, { broughtBy: 'p-sa', heldBy: null });
  });

  it('a malformed student id answers the validation_failed envelope on every seat route', async () => {
    const answers = [
      await t.call('GET', seat('x'), 'sales'),
      await t.put(seat('x'), 'sales', {}),
      await t.call('DELETE', seat('x'), 'sales'),
    ];
    const seen = answers.map((r) => [r.statusCode, r.json<{ message: string }>().message]);
    expect(seen).toEqual(Array(3).fill([400, 'validation_failed']));
    expect(t.seats.repo.take).not.toHaveBeenCalled();
  });

  it('GET and PUT answer the seat, DELETE answers nothing', async () => {
    const view = await t.call('GET', seat(ST), 'sales');
    expect(view.json()).toEqual({ holder: null, mine: false, bringer: true, canTake: true });
    const taken = await t.put(seat(ST), 'sales', {});
    expect(taken.json()).toMatchObject({ mine: true, holder: { id: 'p-sa' } });
    const left = await t.call('DELETE', seat(ST), 'sales');
    expect([left.statusCode, left.body]).toEqual([204, '']);
  });
});
