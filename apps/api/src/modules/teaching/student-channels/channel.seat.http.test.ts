import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelApp, ST } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const SEAT = `/sales/students/${ST}/channel/seat`;
const SARA = { id: 'p-sa', name: 'سارة' };
const HUDA = { id: 'p-sb', name: 'هدى' };

// Any assistant may take the chat's one seat; the one who brought the student comes first:
// one seat per chat. p-sa brought the student.
describe('the assistant seat of a student chat over HTTP', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(t.seats.seat, { broughtBy: 'p-sa', heldBy: null });
  });

  it('a free seat: any assistant sees it free and takes it', async () => {
    const free = (await t.call('GET', SEAT, 'otherSales')).json();
    expect(free).toEqual({ holder: null, mine: false, bringer: false, canTake: true });
    const res = await t.put(SEAT, 'otherSales', {});
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ holder: HUDA, mine: true, bringer: false, canTake: false });
    expect(t.seats.repo.take).toHaveBeenCalledWith({ studentId: ST, profileId: 'p-sb', from: null });
  });

  it('taken: another assistant reads the holder by name and gets 409', async () => {
    t.seats.seat.heldBy = 'p-sa';
    const seen = (await t.call('GET', SEAT, 'otherSales')).json();
    expect(seen).toEqual({ holder: SARA, mine: false, bringer: false, canTake: false });
    const res = await t.put(SEAT, 'otherSales', {});
    expect([res.statusCode, res.json().code]).toEqual([409, 'channel_seat_taken']);
    expect(t.seats.repo.take).not.toHaveBeenCalled();
  });

  it('the bringer takes it over from anyone (priority)', async () => {
    t.seats.seat.heldBy = 'p-sb';
    expect((await t.call('GET', SEAT, 'sales')).json()).toMatchObject({ bringer: true, canTake: true });
    const res = await t.put(SEAT, 'sales', {});
    expect(res.json()).toEqual({ holder: SARA, mine: true, bringer: true, canTake: false });
    expect(t.seats.repo.take).toHaveBeenCalledWith({ studentId: ST, profileId: 'p-sa', from: 'p-sb' });
  });

  it('a holder who is no longer an assistant counts as free', async () => {
    t.seats.seat.heldBy = 'p-gone';
    expect((await t.call('GET', SEAT, 'otherSales')).json()).toMatchObject({ holder: null, canTake: true });
    const res = await t.put(SEAT, 'otherSales', {});
    expect(res.json()).toMatchObject({ holder: HUDA, mine: true });
    expect(t.seats.repo.take).toHaveBeenCalledWith(expect.objectContaining({ from: 'p-gone' }));
  });

  it('mine already: PUT answers as is; a lost race is 409', async () => {
    t.seats.seat.heldBy = 'p-sb';
    expect((await t.put(SEAT, 'otherSales', {})).json()).toMatchObject({ mine: true });
    expect(t.seats.repo.take).not.toHaveBeenCalled();
    t.seats.seat.heldBy = null;
    t.seats.repo.take.mockImplementationOnce(async () => {
      t.seats.seat.heldBy = 'p-sa';
    });
    expect((await t.put(SEAT, 'otherSales', {})).statusCode).toBe(409);
  });

  it('leave: the holder frees it (204, idempotent); another assistant changes nothing', async () => {
    t.seats.seat.heldBy = 'p-sb';
    expect((await t.call('DELETE', SEAT, 'sales')).statusCode).toBe(204);
    expect(t.seats.seat.heldBy).toBe('p-sb');
    expect((await t.call('DELETE', SEAT, 'otherSales')).statusCode).toBe(204);
    expect((await t.call('DELETE', SEAT, 'otherSales')).statusCode).toBe(204);
    expect(t.seats.seat.heldBy).toBeNull();
  });

  it('only the holder writes: anyone else is 404 on the chat routes', async () => {
    t.people.assistantId.mockResolvedValueOnce('p-sb');
    const res = await t.post(`/sales/students/${ST}/channel/messages`, 'sales', { body: 'x' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'student_not_found']);
    t.people.assistantId.mockResolvedValueOnce(null);
    expect((await t.call('GET', `/sales/students/${ST}/channel/unread`, 'sales')).statusCode).toBe(404);
    expect(t.queries.insert).not.toHaveBeenCalled();
  });

  it('an unknown student is 404; the admin has no seat and still only reads', async () => {
    const unknown = '/sales/students/52000000-0000-4000-8000-0000000000ff/channel/seat';
    expect((await t.call('GET', unknown, 'sales')).json().code).toBe('student_not_found');
    expect((await t.put(unknown, 'sales', {})).statusCode).toBe(404);
    expect((await t.put(SEAT, 'admin', {})).statusCode).toBe(403);
    expect((await t.call('GET', `/students/${ST}/channel/messages`, 'admin')).json().read_only).toBe(true);
  });
});
