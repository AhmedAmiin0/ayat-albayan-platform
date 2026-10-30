import { describe, expect, it } from 'vitest';
import ar from '../../i18n/ar.json' with { type: 'json' };
import { nextDstTransition, TZ_OPTIONS, tzChoices, tzOptionLabel } from './time-zone.js';

const localDay = (tz: string, d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

describe('time-zone choices (rule 6)', () => {
  it('every curated zone is a real IANA id with an ar.json city label', () => {
    const cities: Record<string, string | undefined> = ar.tz;
    for (const id of TZ_OPTIONS) {
      expect(() => new Intl.DateTimeFormat('en', { timeZone: id })).not.toThrow();
      expect(cities[id], id).toBeTruthy();
    }
  });

  it('keeps a stored zone outside the list, first', () => {
    expect(tzChoices('Asia/Riyadh')).toEqual([...TZ_OPTIONS]);
    expect(tzChoices('')).toEqual([...TZ_OPTIONS]);
    expect(tzChoices('Asia/Karachi')).toEqual(['Asia/Karachi', ...TZ_OPTIONS]);
  });

  it('labels the city with the id as an isolated LTR island', () => {
    expect(tzOptionLabel('Africa/Cairo', 'القاهرة')).toBe('القاهرة (⁦Africa/Cairo⁩)');
    expect(tzOptionLabel('Asia/Karachi', undefined)).toBe('⁦Asia/Karachi⁩');
  });
});

describe('nextDstTransition (docs/07 §8 DST note)', () => {
  const OCT_1 = new Date('2026-10-01T12:00:00Z');

  it('Cairo goes back an hour from Friday 30 October 2026', () => {
    const shift = nextDstTransition('Africa/Cairo', OCT_1);
    expect(shift?.dir).toBe('back');
    expect(shift && localDay('Africa/Cairo', shift.day)).toBe('2026-10-30');
  });

  it('London goes back on Sunday 25 October 2026', () => {
    const shift = nextDstTransition('Europe/London', OCT_1);
    expect(shift?.dir).toBe('back');
    expect(shift && localDay('Europe/London', shift.day)).toBe('2026-10-25');
  });

  it('Cairo springs forward on the last Friday of April', () => {
    const shift = nextDstTransition('Africa/Cairo', new Date('2027-04-10T12:00:00Z'));
    expect(shift?.dir).toBe('forward');
    expect(shift && localDay('Africa/Cairo', shift.day)).toBe('2027-04-30');
  });

  it('no DST, or the change is past the window → null', () => {
    expect(nextDstTransition('Asia/Riyadh', OCT_1)).toBeNull();
    expect(nextDstTransition('America/New_York', OCT_1)).toBeNull(); // 1 Nov is 31 days out
    expect(nextDstTransition('America/New_York', OCT_1, 45)?.dir).toBe('back');
  });
});
