import { describe, expect, it } from 'vitest';
import { roleCreateSchema, roleUpdateSchema } from './role-schemas.js';

const ok = { key: 'finance_clerk', name_ar: 'محاسب', name_en: 'Clerk', base_role: 'admin' as const };

describe('roleCreateSchema', () => {
  it('accepts a minimal role and defaults permissions to none', () => {
    expect(roleCreateSchema.parse(ok).permissions).toEqual([]);
  });

  it('deduplicates permissions', () => {
    const r = roleCreateSchema.parse({ ...ok, permissions: ['leads.view', 'leads.view', '*'] });
    expect(r.permissions).toEqual(['leads.view', '*']);
  });

  it.each([
    ['unknown permission', { permissions: ['leads.delete'] }],
    ['bad key (uppercase)', { key: 'Clerk' }],
    ['bad key (digit first)', { key: '1clerk' }],
    ['bad key (too short)', { key: 'a' }],
    ['unknown base role', { base_role: 'owner' }],
    ['blank Arabic name', { name_ar: '   ' }],
    ['missing English name', { name_en: undefined }],
    ['permissions not an array', { permissions: 'leads.view' }],
  ])('rejects %s', (_label, patch) => {
    expect(roleCreateSchema.safeParse({ ...ok, ...patch }).success).toBe(false);
  });
});

describe('roleUpdateSchema', () => {
  it('is all optional', () => {
    expect(roleUpdateSchema.parse({})).toEqual({});
    expect(roleUpdateSchema.parse({ name_ar: ' اسم ' })).toEqual({ name_ar: 'اسم' });
  });

  it('still validates what is sent', () => {
    expect(roleUpdateSchema.safeParse({ permissions: ['nope'] }).success).toBe(false);
  });
});
