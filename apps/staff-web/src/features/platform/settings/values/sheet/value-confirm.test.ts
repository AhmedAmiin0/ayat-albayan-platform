import { describe, expect, it } from 'vitest';
import { confirmKind } from './value-confirm';

describe('confirmKind', () => {
  it('plain for the booking-wide switches, nothing for an ordinary value', () => {
    expect(confirmKind('teachers_always_available', false, true)).toBe('plain');
    expect(confirmKind('fx_fresh_hours', 6, 24)).toBeUndefined();
  });

  it('typed only when retention starts (from OFF) or gets shorter', () => {
    expect(confirmKind('recording_retention_days', 30, null)).toBe('typed');
    expect(confirmKind('activity_retention_days', 30, 90)).toBe('typed');
    expect(confirmKind('activity_retention_days', 30)).toBe('typed');
  });

  it('lengthening, keeping or turning retention off saves without typing', () => {
    expect(confirmKind('activity_retention_days', 120, 90)).toBeUndefined();
    expect(confirmKind('activity_retention_days', 90, 90)).toBeUndefined();
    expect(confirmKind('recording_retention_days', null, 30)).toBeUndefined();
  });
});
