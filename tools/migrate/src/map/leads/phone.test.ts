import { describe, expect, it } from 'vitest';
import { toE164 } from './phone.ts';

describe('toE164', () => {
  it("adds the '+' WhatsApp ids lack and infers the tz", () => {
    expect(toE164('966551110001')).toEqual({ e164: '+966551110001', tz: 'Asia/Riyadh' });
    expect(toE164('97455110003')).toEqual({ e164: '+97455110003', tz: 'Asia/Qatar' });
    expect(toE164('96899110005')?.tz).toBe('Asia/Muscat');
    expect(toE164('201001110002')?.tz).toBe('Africa/Cairo');
  });

  it('keeps an existing + and accepts sheet number cells', () => {
    expect(toE164('+966551110001')?.e164).toBe('+966551110001');
    expect(toE164(966551110001)?.e164).toBe('+966551110001');
  });

  it('falls back to local forms (05…, 01…, 00…)', () => {
    expect(toE164('0551110001')?.e164).toBe('+966551110001');
    expect(toE164('01001110002')?.e164).toBe('+201001110002');
    expect(toE164('00966551110001')?.e164).toBe('+966551110001');
  });

  it('gives every number a tz, same as guardians (Sudan, Yemen …)', () => {
    expect(toE164('249911110006')).toEqual({ e164: '+249911110006', tz: 'Africa/Khartoum' });
    expect(toE164('967711110006')?.tz).toBe('Asia/Aden');
  });

  it('never invents a +1 number from a bare Egyptian mobile', () => {
    expect(toE164('1012345678')).toEqual({ e164: '+201012345678', tz: 'Africa/Cairo' });
  });

  it('rejects empty, handles and short numbers (A8)', () => {
    for (const bad of [null, undefined, '', '  ', '#ERROR!', '@someone', '12345', '1312345678'])
      expect(toE164(bad)).toBeUndefined();
  });
});
