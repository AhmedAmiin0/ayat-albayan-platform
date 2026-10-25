import { describe, expect, it } from 'vitest';
import { guardianCountry, quoteSelection } from './price';

const base = { durationMin: 45, country: 'SA', students: 1 } as const;

describe('quoteSelection (docs/08 packages)', () => {
  it('maps package sizes onto the site tiers', () => {
    expect(quoteSelection({ ...base, pkg: '8' })).toMatchObject({ pkg: 'starter', duration: 45, country: 'SA' });
    expect(quoteSelection({ ...base, pkg: '12' })?.pkg).toBe('standard');
    expect(quoteSelection({ ...base, pkg: '16' })?.pkg).toBe('premium');
    expect(quoteSelection({ ...base, pkg: '20' })?.pkg).toBe('monthly');
    expect(quoteSelection({ ...base, pkg: '28' })?.pkg).toBe('bulk');
  });

  it('4 lessons are the weekly package at 90 minutes, a custom count otherwise', () => {
    expect(quoteSelection({ ...base, pkg: '4', durationMin: 90 })).toMatchObject({ pkg: 'weekly', duration: 45 });
    expect(quoteSelection({ ...base, pkg: '4' })).toMatchObject({ pkg: 'custom', count: 4, duration: 45 });
  });

  it('has no price for the free trial, 90-minute tiers or a group above 6', () => {
    expect(quoteSelection({ ...base, pkg: 'trial' })).toBeNull();
    expect(quoteSelection({ ...base, pkg: '8', durationMin: 90 })).toBeNull();
    expect(quoteSelection({ ...base, pkg: '8', students: 7 })).toBeNull();
  });

  it('quotes other countries in USD and counts the students', () => {
    expect(quoteSelection({ ...base, pkg: '8', country: 'EG', students: 2 })).toMatchObject({
      country: 'other',
      students: 2,
    });
    expect(quoteSelection({ ...base, pkg: '8', country: null })?.country).toBe('other');
  });
});

describe('guardianCountry', () => {
  it('prefers the stored country, else the phone calling code', () => {
    expect(guardianCountry({ country: 'KW', phone_e164: '+966501234567' })).toBe('KW');
    expect(guardianCountry({ country: null, phone_e164: '+966501234567' })).toBe('SA');
    expect(guardianCountry({ phone_e164: '+447700900123' })).toBeNull();
  });
});
