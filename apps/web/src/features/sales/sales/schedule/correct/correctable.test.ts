import { describe, expect, it } from 'vitest';
import { scheduleLesson } from '@/features/sales/sales/academy.fixtures';
import { canSalesCorrect } from './correctable';

// The fixture lesson runs 15:00–15:30Z.
const AFTER = new Date('2026-10-12T16:00:00.000Z');
const BEFORE = new Date('2026-10-12T14:00:00.000Z');
const OFF = { now: AFTER, required: false, holds: true };

describe('canSalesCorrect («لم تنعقد؟», owner 2026-11-02)', () => {
  it('a completed lesson, whatever the setting (the API answers not_auto_held when not)', () => {
    const held = scheduleLesson({ status: 'completed' });
    expect(canSalesCorrect(held, OFF)).toBe(true);
    expect(canSalesCorrect(held, { ...OFF, required: true })).toBe(true);
  });

  it('an open lesson, before or after its end, only while no confirmation is required', () => {
    expect(canSalesCorrect(scheduleLesson({ status: 'scheduled' }), OFF)).toBe(true);
    expect(canSalesCorrect(scheduleLesson({ status: 'confirmed' }), OFF)).toBe(true);
    expect(canSalesCorrect(scheduleLesson(), { ...OFF, required: true })).toBe(false);
    expect(canSalesCorrect(scheduleLesson(), { ...OFF, now: BEFORE })).toBe(true);
    expect(canSalesCorrect(scheduleLesson({ status: 'cancelled_by_admin' }), OFF)).toBe(false);
  });

  it('never without lessons.cancel', () => {
    expect(canSalesCorrect(scheduleLesson(), { ...OFF, holds: false })).toBe(false);
  });
});
