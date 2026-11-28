import { describe, expect, it } from 'vitest';
import { availabilityRoutes } from './availability.routes';

const ID = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const OFF = '0b7a2f4e-3c1d-4e5f-8a9b-1c2d3e4f5a6b';
const slot = { id: ID, weekday: 0, start_time: '09:00', end_time: '12:00', tz: 'Africa/Cairo' };
const timeOff = {
  id: OFF,
  teacher_id: ID,
  starts_at: '2026-12-01T08:00:00+00:00',
  ends_at: '2026-12-02T08:00:00+00:00',
  reason: null,
  created_at: '2026-11-20T08:00:00+00:00',
  created_by: null,
  updated_at: '2026-11-20T08:00:00+00:00',
};

describe('availabilityRoutes (R-TCH-02)', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(availabilityRoutes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /teachers/:id/availability',
      'PUT /teachers/:id/availability',
      'GET /teachers/:id/time-off',
      'POST /teachers/:id/time-off',
      'PUT /teachers/:id/time-off/:timeOffId',
      'DELETE /teachers/:id/time-off/:timeOffId',
    ]);
  });

  it('answers the weekly grid and the time-off as stored', () => {
    expect(availabilityRoutes.grid.response.parse([slot])).toEqual([slot]);
    expect(availabilityRoutes.timeOff.response.parse([timeOff])).toEqual([timeOff]);
    expect(availabilityRoutes.addTimeOff.response.parse(timeOff)).toEqual(timeOff);
  });

  it('refuses a slot on a weekday past Saturday or a time-off without its teacher', () => {
    expect(availabilityRoutes.grid.response.safeParse([{ ...slot, weekday: 7 }]).success).toBe(
      false,
    );
    const { teacher_id: _, ...loose } = timeOff;
    expect(availabilityRoutes.editTimeOff.response.safeParse(loose).success).toBe(false);
  });

  it('refuses a slot that ends before it starts and a time-off that ends first', () => {
    const late = { ...slot, start_time: '12:00', end_time: '09:00' };
    expect(availabilityRoutes.replaceGrid.body.safeParse({ slots: [late] }).success).toBe(false);
    const back = { starts_at: timeOff.ends_at, ends_at: timeOff.starts_at };
    expect(availabilityRoutes.addTimeOff.body.safeParse(back).success).toBe(false);
  });

  it('refuses a bad teacher or time-off id in the path', () => {
    expect(availabilityRoutes.grid.params.safeParse({ id: 'abc' }).success).toBe(false);
    const remove = availabilityRoutes.removeTimeOff.params;
    expect(remove.safeParse({ id: ID, timeOffId: 'abc' }).success).toBe(false);
    expect(remove.safeParse({ id: ID, timeOffId: OFF }).success).toBe(true);
  });
});
