import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { SETTINGS } from '@/test/settings-fixture';
import { isSaveOutcome, serverMessage, wasInvalid, wasMoved } from './save-result';

describe('PATCH /settings answers', () => {
  it('reads both shapes: the whole settings (today) and {saved, moved}', () => {
    expect(isSaveOutcome(SETTINGS)).toBe(false);
    expect(isSaveOutcome({ saved: ['fx_fresh_hours'], moved: [] })).toBe(true);
    expect(isSaveOutcome({ saved: 'x', moved: [] })).toBe(false);
    expect(isSaveOutcome(null)).toBe(false);
  });

  it('a key is moved by its row key or its camelCase field', () => {
    expect(wasMoved({ saved: [], moved: ['late_cancel_hours'] }, 'late_cancel_hours')).toBe(true);
    expect(wasMoved({ saved: [], moved: ['lateCancelHours'] }, 'late_cancel_hours')).toBe(true);
    expect(wasMoved({ saved: ['lateCancelHours'], moved: [] }, 'late_cancel_hours')).toBe(false);
    expect(wasMoved(SETTINGS, 'late_cancel_hours')).toBe(false);
  });

  it('a key is invalid by its row key or field; the whole settings or another key is not', () => {
    const res = { ...SETTINGS, saved: [], moved: [], invalid: ['booking_horizon_weeks'] };
    expect(wasInvalid(res, 'booking_horizon_weeks')).toBe(true);
    expect(wasInvalid({ ...res, invalid: ['bookingHorizonWeeks'] }, 'booking_horizon_weeks')).toBe(true);
    expect(wasInvalid(res, 'fx_fresh_hours')).toBe(false);
    expect(wasInvalid(SETTINGS, 'booking_horizon_weeks')).toBe(false);
    expect(wasInvalid({ invalid: 'x' }, 'booking_horizon_weeks')).toBe(false);
    expect(wasInvalid(null, 'booking_horizon_weeks')).toBe(false);
  });

  it('keeps the server’s message when there is one', () => {
    expect(serverMessage(new ApiError(400, { message: 'bad value' }))).toBe('bad value');
    expect(serverMessage(new ApiError(400, { message: ['a', 'b'] }))).toBe('a، b');
    expect(serverMessage(new ApiError(500, null))).toBeUndefined();
    expect(serverMessage(new Error('x'))).toBeUndefined();
  });
});
