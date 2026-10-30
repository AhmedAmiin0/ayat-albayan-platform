import { describe, expect, it } from 'vitest';
import { callsNeedKapso, commsSourceSchema, isNumberError, numberCreateSchema, numberSecretSchema, numbersImportSchema, numberUpdateSchema } from './schemas.js';

const base = { label: 'رقم الإشعارات', purpose: 'notifications', phone_number_id: '1000000001' };

describe('numbers schemas (docs/23 §3 phase 3)', () => {
  it('a new number defaults to meta and disabled', () => {
    expect(numberCreateSchema.parse(base)).toMatchObject({ provider: 'meta', enabled: false });
  });

  it('refuses an id with spaces or symbols, an empty label and an unknown role', () => {
    expect(numberCreateSchema.safeParse({ ...base, phone_number_id: '12 34' }).success).toBe(false);
    expect(numberCreateSchema.safeParse({ ...base, waba_id: "1'; drop" }).success).toBe(false);
    expect(numberCreateSchema.safeParse({ ...base, label: '   ' }).success).toBe(false);
    expect(numberCreateSchema.safeParse({ ...base, purpose: 'sales' }).success).toBe(false);
  });

  it('an update needs at least one field; ids may be cleared with null', () => {
    expect(numberUpdateSchema.safeParse({}).success).toBe(false);
    expect(numberUpdateSchema.parse({ waba_id: null })).toEqual({ waba_id: null });
    expect(numberUpdateSchema.parse({ is_default: true })).toEqual({ is_default: true });
  });

  it('a secret is non-blank and at most 4096 characters', () => {
    expect(numberSecretSchema.safeParse({ value: '  ' }).success).toBe(false);
    expect(numberSecretSchema.safeParse({ value: 'x'.repeat(4097) }).success).toBe(false);
    expect(numberSecretSchema.parse({ value: ' fake-token ' }).value).toBe('fake-token');
  });

  it('import needs dryRun; the source is legacy or module only', () => {
    expect(numbersImportSchema.safeParse({}).success).toBe(false);
    expect(commsSourceSchema.safeParse({ source: 'module' }).success).toBe(true);
    expect(commsSourceSchema.safeParse({ source: 'env' }).success).toBe(false);
    expect(isNumberError('parity_not_empty')).toBe(true);
    expect(isNumberError('nope')).toBe(false);
  });

  it('a calls number (docs/28 §10) is kapso only, on create and in a patch check', () => {
    expect(numberCreateSchema.safeParse({ ...base, purpose: 'calls' }).success).toBe(false);
    expect(numberCreateSchema.safeParse({ ...base, purpose: 'calls', provider: 'meta' }).success).toBe(false);
    expect(numberCreateSchema.parse({ ...base, purpose: 'calls', provider: 'kapso' })).toMatchObject({ purpose: 'calls' });
    expect(numberUpdateSchema.parse({ purpose: 'calls' })).toEqual({ purpose: 'calls' });
    expect(callsNeedKapso({ purpose: 'calls', provider: 'crm' })).toBe(true);
    expect(callsNeedKapso({ purpose: 'chat', provider: 'meta' })).toBe(false);
    expect(isNumberError('calls_need_kapso')).toBe(true);
  });
});
