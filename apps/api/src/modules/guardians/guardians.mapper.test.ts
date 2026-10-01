import { describe, expect, it } from 'vitest';
import {
  guardianSearchFilter,
  inferCountry,
  phoneSearchDigits,
  toGuardianInsert,
  toGuardianPatch,
} from './guardians.mapper';

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

describe('phone search (R-STU-02)', () => {
  it.each([
    ['0501234567', '966501234567'],
    ['+966 50 123 4567', '966501234567'],
    ['٠٥٠١٢٣٤٥٦٧', '966501234567'],
    ['4567', '4567'],
    ['0050', '50'],
  ])('%s → %s', (term, digits) => {
    expect(phoneSearchDigits(term)).toBe(digits);
  });

  it('is null for names, codes and short numbers', () => {
    expect(phoneSearchDigits('سهيلة')).toBeNull();
    expect(phoneSearchDigits('AB-0183')).toBeNull();
    expect(phoneSearchDigits('123')).toBeNull();
  });

  it('guardian filter: phone contains, else name ilike, else none', () => {
    expect(guardianSearchFilter('0501234567')).toBe('phone_e164.ilike.*966501234567*');
    expect(guardianSearchFilter('ام جود')).toBe('name.ilike.*ام جود*');
    expect(guardianSearchFilter('  ')).toBeNull();
  });
});
