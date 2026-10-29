import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { fakeDb } from './fake-db';
import { GuardiansService } from './guardians.service';

const G = { id: 'g1', name: 'ام جود', phone_e164: '+966501234567' };

describe('GuardiansService (R-STU-02, R-STU-04)', () => {
  it('list: paginates, filters by phone digits (any family number, main or second) and returns the total', async () => {
    const { db, argsOf } = fakeDb({
      guardian_phones: [{ data: [{ guardian_id: 'g1' }, { guardian_id: 'g2' }, { guardian_id: 'g1' }] }],
      guardians: [{ data: [G], count: 41 }],
    });
    const page = await new GuardiansService(db).list({ search: '0501234567', page: 3, pageSize: 20 });
    expect(page).toEqual({ items: [G], total: 41, page: 3, pageSize: 20 });
    expect(argsOf('guardian_phones', 'ilike')).toEqual(['phone_e164', '%501234567%']);
    expect(argsOf('guardians', 'in')).toEqual(['id', ['g1', 'g2']]);
    expect(argsOf('guardians', 'or')).toBeUndefined();
    expect(argsOf('guardians', 'range')).toEqual([40, 59]);
  });

  it('list by name: the name filter, no number read', async () => {
    const { db, argsOf, trips } = fakeDb({ guardians: [{ data: [], count: 0 }] });
    await new GuardiansService(db).list({ search: 'جود', page: 1, pageSize: 20 });
    expect(argsOf('guardians', 'or')).toEqual(['name.ilike.*جود*']);
    expect(trips).toEqual(['guardians']);
  });

  it('list without search applies no filter', async () => {
    const { db, argsOf } = fakeDb({ guardians: [{ data: [], count: 0 }] });
    await new GuardiansService(db).list({ search: '', page: 1, pageSize: 20 });
    expect(argsOf('guardians', 'or')).toBeUndefined();
    expect(argsOf('guardians', 'in')).toBeUndefined();
  });

  it('get: 404 when missing; returns guardian with students and every family number', async () => {
    const phones = [{ phone_e164: G.phone_e164, is_primary: true, created_at: '2026-10-29T10:00:00Z' }];
    const { db, argsOf } = fakeDb({ guardians: [{ data: null }, { data: { ...G, students: [], phones } }] });
    const svc = new GuardiansService(db);
    await expect(svc.get('nope')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.get('g1')).resolves.toEqual({ ...G, students: [], phones });
    expect(String(argsOf('guardians', 'select')?.[0])).toContain('phones:guardian_phones(phone_e164, is_primary, created_at)');
  });

  it('findByPhone looks up the exact E.164 number', async () => {
    const { db, argsOf } = fakeDb({ guardians: [{ data: G }] });
    await expect(new GuardiansService(db).findByPhone('+966501234567')).resolves.toEqual(G);
    expect(argsOf('guardians', 'eq')).toEqual(['phone_e164', '+966501234567']);
  });

  it('create: inserts the mapped row; a taken phone is 409 phone_taken', async () => {
    const { db, argsOf } = fakeDb({
      guardians: [{ data: G }, { error: { code: '23505', message: 'duplicate key' } }],
    });
    const svc = new GuardiansService(db);
    const dto = { name: 'ام جود', phone_e164: '+966501234567', tz: 'Asia/Riyadh' };
    await expect(svc.create(dto, 'u1')).resolves.toEqual(G);
    expect(argsOf('guardians', 'insert')).toEqual([{ ...dto, country: 'SA', created_by: 'u1' }]);
    await expect(svc.create(dto, 'u1')).rejects.toThrow(new ConflictException('phone_taken'));
  });

  it('remove: 409 has_students while referenced, 404 when missing', async () => {
    const { db } = fakeDb({
      guardians: [{ error: { code: '23503', message: 'fk' } }, { data: [] }, { data: [{ id: 'g1' }] }],
    });
    const svc = new GuardiansService(db);
    await expect(svc.remove('g1')).rejects.toThrow(new ConflictException('has_students'));
    await expect(svc.remove('g1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.remove('g1')).resolves.toBeUndefined();
  });
});
