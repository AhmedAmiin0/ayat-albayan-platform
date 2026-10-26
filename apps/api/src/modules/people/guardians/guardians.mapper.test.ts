import { describe, expect, it } from 'vitest';
import { guardianSearchFilter, inferCountry, toGuardianInsert, toGuardianPatch } from './guardians.mapper';

const dto = { name: 'ام جود', phone_e164: '+966501234567', tz: 'Asia/Riyadh' };

describe('guardians mapper (R-STU-02)', () => {
  it('infers the country from the phone', () => {
    expect(inferCountry('+966501234567')).toBe('SA');
    expect(inferCountry('+201001234567')).toBe('EG');
    expect(inferCountry('+97455123398')).toBe('QA');
    expect(inferCountry('+971501234567')).toBe('AE');
    expect(inferCountry('+358401234567')).toBeNull();
  });

  it('insert fills country + created_by and keeps an explicit country', () => {
    expect(toGuardianInsert(dto, 'u1')).toEqual({ ...dto, country: 'SA', created_by: 'u1' });
    expect(toGuardianInsert({ ...dto, country: 'Oman' }, 'u1').country).toBe('Oman');
  });

  it('patch re-infers the country only when the phone changes without one', () => {
    expect(toGuardianPatch({ name: 'x' })).toEqual({ name: 'x' });
    expect(toGuardianPatch({ phone_e164: '+201001234567' })).toEqual({
      phone_e164: '+201001234567',
      country: 'EG',
    });
    expect(toGuardianPatch({ phone_e164: '+201001234567', country: 'Sudan' }).country).toBe('Sudan');
  });
});

describe('guardian search filter (R-STU-02): searchDigits, else the name', () => {
  it.each([
    ['0501234567', 'phone_e164.ilike.*501234567*'], // a local number: under any country code
    ['+966 50 123 4567', 'phone_e164.ilike.*966501234567*'],
    ['٥٦٦١٠', 'phone_e164.ilike.*56610*'],
    ['٠٥٦ 610', 'phone_e164.ilike.*56610*'],
    ['ام جود', 'name.ilike.*ام جود*'],
  ])('%s → %s', (term, filter) => {
    expect(guardianSearchFilter(term)).toBe(filter);
  });

  it('nothing searchable → no filter', () => {
    expect(guardianSearchFilter('  ')).toBeNull();
    expect(guardianSearchFilter('(),')).toBeNull();
  });
});
