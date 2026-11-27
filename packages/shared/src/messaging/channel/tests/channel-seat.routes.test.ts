import { describe, expect, it } from 'vitest';
import { channelSeatRoutes as routes } from '../channel-seat.routes';

const ID = 'a1111111-1111-4111-8111-111111111111';
const SEAT = { holder: { id: 'p-a', name: 'سارة' }, mine: true, bringer: false, canTake: false };

describe('channelSeatRoutes', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /sales/students/:id/channel/seat',
      'PUT /sales/students/:id/channel/seat',
      'DELETE /sales/students/:id/channel/seat',
    ]);
  });

  it('takes the student id and refuses anything else', () => {
    expect(routes.view.params.parse({ id: ID })).toEqual({ id: ID });
    expect(routes.take.params.safeParse({ id: 'x' }).success).toBe(false);
    expect(routes.leave.params.safeParse({}).success).toBe(false);
  });

  it('answers the seat by its holder name, free as a null holder', () => {
    expect(routes.view.response.parse(SEAT)).toEqual(SEAT);
    const free = { ...SEAT, holder: null, mine: false, canTake: true };
    expect(routes.take.response.parse(free)).toEqual(free);
    expect(routes.view.response.safeParse({ ...SEAT, holder: 'p-a' }).success).toBe(false);
  });

  it('answers nothing when the seat is left', () => {
    expect(routes.leave.response).toBe('empty');
  });
});
