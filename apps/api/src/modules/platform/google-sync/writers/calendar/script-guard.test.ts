import { describe, expect, it } from 'vitest';
import { isScriptEvent } from './script-guard';

const START = '2026-11-01T14:00:00Z';
const ev = (over = {}) => ({ id: 'e1', status: 'confirmed', summary: 'حلقة — طالب', description: '', start: { dateTime: '2026-11-01T17:00:00+03:00' }, ...over });

describe('isScriptEvent (the duplicate guard)', () => {
  it('the script title at the same instant (any offset) is the script event', () => {
    expect(isScriptEvent(ev(), START)).toBe(true);
  });

  it('or the script sheet line in the description, whatever the title', () => {
    expect(isScriptEvent(ev({ summary: 'x', description: 'a\n\nمربوط تلقائيًا بتاب تقويم الحجوزات — عدّل في الشيت مش هنا.' }), START)).toBe(true);
  });

  it('never our own tagged event, a cancelled one, another start, or an unrelated event', () => {
    expect(isScriptEvent(ev({ extendedProperties: { private: { ab_source: 'platform' } } }), START)).toBe(false);
    expect(isScriptEvent(ev({ status: 'cancelled' }), START)).toBe(false);
    expect(isScriptEvent(ev({ start: { dateTime: '2026-11-01T18:00:00+03:00' } }), START)).toBe(false);
    expect(isScriptEvent(ev({ summary: 'اجتماع' }), START)).toBe(false);
    expect(isScriptEvent(ev({ start: { date: '2026-11-01' } }), START)).toBe(false);
  });
});
