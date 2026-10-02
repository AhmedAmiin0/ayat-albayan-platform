// Cell helpers on invented values: A8 phone formats, gotcha 7 times, A9 duplicate questions.
import { describe, expect, it } from 'vitest';
import {
  dateTime,
  firstText,
  hhmm,
  legacyCode,
  num,
  phoneCell,
  text,
  personTz,
  tzForPhone,
  ymd,
} from './cells.ts';
import { issueLabelKey, issueOnly } from './issues.ts';

describe('text / num', () => {
  it('trims, drops bidi marks and treats dashes and lone commas as empty', () => {
    expect(text('  ‪ليان‬ ')).toBe('ليان');
    expect(text('—')).toBeNull();
    expect(text(',')).toBeNull(); // empty multi-select «المصدر»
    expect(text(null)).toBeNull();
    expect(text(45)).toBe('45');
  });

  it('reads numbers from cells and text', () => {
    expect(num(45)).toBe(45);
    expect(num('45 دقيقة')).toBe(45);
    expect(num('بدون')).toBeNull();
  });
});

describe('phoneCell (A8: four formats)', () => {
  it.each([
    ['966551110001', '+966551110001'],
    [966551110001, '+966551110001'],
    ['+966 55 111 0001', '+966551110001'],
    ['966 55 111 0001', '+966551110001'],
    ['‪+966 55 111 0001‬', '+966551110001'],
    ['0551110001', '+966551110001'],
    ['201011110001', '+201011110001'],
    ['01011110001', '+201011110001'],
    ['+974 5511 0001', '+97455110001'],
  ])('%s → %s', (raw, e164) => {
    expect(phoneCell(raw)).toEqual({ ok: true, e164 });
  });

  it('rejects handles, errors and numbers without a country code', () => {
    expect(phoneCell('@SomeHandle1')).toEqual({ ok: false, reason: 'not_a_number' });
    expect(phoneCell('#ERROR!')).toEqual({ ok: false, reason: 'not_a_number' });
    expect(phoneCell('1311110001')).toEqual({ ok: false, reason: 'missing_country_code' });
    expect(phoneCell('')).toEqual({ ok: false, reason: 'empty' });
    expect(phoneCell('9665511')).toEqual({ ok: false, reason: 'missing_country_code' });
  });

  it('repairs the two Egyptian shapes: trunk zero after 20, bare 1x mobile', () => {
    expect(phoneCell('2001011110001')).toEqual({ ok: true, e164: '+201011110001' });
    expect(phoneCell('+20 0101 111 0001')).toEqual({ ok: true, e164: '+201011110001' });
    expect(phoneCell('1011110001')).toEqual({ ok: true, e164: '+201011110001' });
    expect(phoneCell('1511110001')).toEqual({ ok: true, e164: '+201511110001' });
  });
});

describe('tzForPhone / personTz', () => {
  it('maps calling codes to home zones, Riyadh by default', () => {
    expect(tzForPhone('+966551110001')).toBe('Asia/Riyadh');
    expect(tzForPhone('+201011110001')).toBe('Africa/Cairo');
    expect(tzForPhone('+96555110001')).toBe('Asia/Kuwait');
    expect(tzForPhone('+249911110001')).toBe('Africa/Khartoum');
    expect(tzForPhone('+358401110001')).toBe('Europe/Helsinki');
    expect(tzForPhone('+81311110001')).toBe('Asia/Riyadh');
  });

  it('prefers the declared country over the phone', () => {
    expect(personTz({ declared: 'الكويت', phone: '+966551110001' })).toBe('Asia/Kuwait');
    expect(personTz({ declared: 'السعودية', phone: '+201011110001' })).toBe('Asia/Riyadh');
    expect(personTz({ declared: 'مكان ما', phone: '+201011110001' })).toBe('Africa/Cairo');
    expect(personTz({ declared: null, phone: '+96555110001' })).toBe('Asia/Kuwait');
  });
});

describe('legacyCode / hhmm / ymd / dateTime', () => {
  it('finds AB codes in their own column or inside booking notes', () => {
    expect(legacyCode('AB-0042')).toBe(42);
    expect(legacyCode('تجريبية · AB-0187 · 45 دقيقة')).toBe(187);
    expect(legacyCode('بدون')).toBeNull();
  });

  it('pads unpadded times and rejects junk (gotcha 7)', () => {
    expect(hhmm('9:30')).toBe('09:30');
    expect(hhmm('21:05')).toBe('21:05');
    expect(hhmm('25:00')).toBeNull();
    expect(hhmm('الساعة 7')).toBeNull();
  });

  it('splits zone-less wall clock values', () => {
    expect(ymd('2026-09-10T19:30:05')).toBe('2026-09-10');
    expect(ymd('10/9/2026')).toBeNull();
    expect(dateTime('2026-09-10T19:30:05')).toEqual({ date: '2026-09-10', time: '19:30', sec: 5 });
    expect(dateTime('2026-09-10')).toBeNull();
  });

  it('firstText reads the same question under two headers (A9)', () => {
    expect(firstText(null, ',', 'واتساب')).toBe('واتساب');
    expect(firstText(null, null)).toBeNull();
  });
});

describe('issues', () => {
  it('labels issues with an ar.json key and groups orphan issues by row', () => {
    expect(issueLabelKey('sibling_split')).toBe('migrate.issue.sibling_split');
    const ref = { source: 'HUB' as const, tab: 't', row: 3 };
    const a = {
      code: 'test_row' as const,
      severity: 'reject' as const,
      entity: 'students' as const,
      ref,
    };
    const out = issueOnly([a, { ...a, code: 'bad_phone' }, { ...a, ref: { ...ref, row: 4 } }]);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      ok: false,
      issues: [{ code: 'test_row' }, { code: 'bad_phone' }],
    });
  });
});
