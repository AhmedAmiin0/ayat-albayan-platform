import { describe, expect, it } from 'vitest';
import { crmRef, rowsByAge, text } from '../../sources/crm/rows.ts';
import { crmIndex, isTestRow } from './contacts.ts';
import { EG, SA, contact, crm, message } from './fixtures.ts';

describe('crm rows', () => {
  it('reads trimmed scalars only', () => {
    expect(text({ a: '  x ', b: '', c: null, d: { e: 1 }, f: 7 }, 'a')).toBe('x');
    for (const col of ['b', 'c', 'd', 'missing'])
      expect(text({ b: '', c: null, d: {} }, col)).toBeNull();
    expect(text({ f: 7 }, 'f')).toBe('7');
  });
  it('refs carry the CRM id and sort by age', () => {
    expect(crmRef('contacts', { id: 'k1' })).toEqual({
      source: 'CRM',
      tab: 'contacts',
      row: 0,
      id: 'k1',
    });
    const rows = rowsByAge(
      { m: [{ created_at: '2026-09-02' }, { created_at: '2026-09-01' }] },
      'm',
    );
    expect(rows.map((r) => r['created_at'])).toEqual(['2026-09-01', '2026-09-02']);
    expect(rowsByAge({}, 'none')).toEqual([]);
  });
});

describe('crmIndex', () => {
  const tables = crm({
    contacts: [contact('k1', SA, 'أم سليم'), contact('k2', EG, EG), contact('k3', '', 'x')],
    tags: { k1: ['whatsapp', 'جديد', 'whatsapp'] },
    messages: [
      message({ id: 'm2', conv: 'c-k1', sender: 'agent', at: '2026-09-12T10:00:00+00:00' }),
      message({ id: 'm1', conv: 'c-k1', sender: 'customer', at: '2026-09-12T09:00:00+00:00' }),
      message({ id: 'm3', conv: 'c-unknown', sender: 'customer', at: '2026-09-12T09:00:00+00:00' }),
    ],
  });
  const idx = crmIndex(tables);

  it('normalises phones, drops number-only names and sorts unique tags', () => {
    const k1 = idx.contacts.get('k1');
    expect(k1?.phone).toEqual({ e164: '+966551110001', tz: 'Asia/Riyadh' });
    expect(k1?.name).toBe('أم سليم');
    expect(k1?.tags).toEqual(['whatsapp', 'جديد']);
    expect(idx.contacts.get('k2')?.name).toBeNull();
    expect(idx.contacts.get('k3')?.phone).toBeUndefined();
  });

  it('groups messages per contact, oldest first, ignoring unknown conversations', () => {
    expect(idx.contactOf.get('c-k2')).toBe('k2');
    expect(idx.messages.get('k1')?.map((m) => m['id'])).toEqual(['m1', 'm2']);
    expect([...idx.messages.keys()]).toEqual(['k1']);
  });
});

describe('isTestRow (A6)', () => {
  const phone = { e164: '+966551110001', tz: 'Asia/Riyadh' };
  it('catches dummy numbers and test names', () => {
    expect(isTestRow({ name: null, phone: { e164: '+966500000000', tz: 'Asia/Riyadh' } })).toBe(
      true,
    );
    expect(isTestRow({ name: 'Lorem ipsum', phone })).toBe(true);
    expect(isTestRow({ name: 'TEST user', phone })).toBe(true);
    expect(isTestRow({ name: 'تجربة', phone })).toBe(true);
    expect(isTestRow({ name: 'نمنم', phone })).toBe(true);
  });
  it('leaves real-looking rows', () => {
    expect(isTestRow({ name: 'سارة', phone })).toBe(false);
    expect(isTestRow({ name: 'Testimony', phone })).toBe(false);
    expect(isTestRow({ name: null, phone: undefined })).toBe(false);
  });
});
