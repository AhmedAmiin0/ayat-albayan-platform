import { describe, expect, it } from 'vitest';
import { cityOf, durationText, esc, fill, localDate, ltr, para, stamp, timeWithZone, weekdayName } from './pdf-text';

describe('pdf-text helpers (R-REP-03)', () => {
  it('esc escapes markup and quotes', () => {
    expect(esc('<b a="1">&</b>')).toBe('&lt;b a=&quot;1&quot;&gt;&amp;&lt;/b&gt;');
  });

  it('para: blank → «—», text escaped with line breaks kept', () => {
    expect(para(null)).toBe('—');
    expect(para('  \n ')).toBe('—');
    expect(para(' سطر\r\nسطر <2> ')).toBe('سطر<br>سطر &lt;2&gt;');
  });

  it('fill replaces known slots and leaves unknown ones', () => {
    expect(fill('{n} من {total} {x}', { n: 6, total: '8' })).toBe('6 من 8 {x}');
  });

  it('ltr isolates and escapes', () => {
    expect(ltr('+966 <x>')).toBe('<bdi dir="ltr" class="ltr">+966 &lt;x&gt;</bdi>');
  });

  it('local date and weekday follow the zone, across midnight', () => {
    const late = new Date('2026-09-29T22:30:00Z');
    expect(localDate(late, 'Asia/Riyadh')).toBe('2026-09-30');
    expect(localDate(late, 'America/New_York')).toBe('2026-09-29');
    expect(weekdayName(late, 'Asia/Riyadh')).toBe('الأربعاء');
    expect(weekdayName(late, 'America/New_York')).toBe('الثلاثاء');
  });

  it('cityOf: the ar.json city, else the IANA id', () => {
    expect(cityOf('Asia/Muscat')).toBe('مسقط');
    expect(cityOf('Asia/Tokyo')).toBe('Asia/Tokyo');
  });

  it('durationText: the four standard lengths from enums.duration, else «n دقيقة»', () => {
    expect(durationText(30)).toBe('30 دقيقة');
    expect(durationText(60)).toBe('60 دقيقة');
    expect(durationText(90)).toBe('90 دقيقة');
    expect(durationText(50)).toBe('50 دقيقة');
  });

  it('timeWithZone names the zone (docs/07 principle 7)', () => {
    expect(timeWithZone(new Date('2026-09-29T14:00:00Z'), 'Asia/Muscat')).toBe(
      '<bdi dir="ltr" class="ltr">18:00</bdi> بتوقيت مسقط',
    );
  });

  it('stamp: «YYYY/MM/DD — HH:MM» in the zone', () => {
    expect(stamp(new Date('2026-09-29T16:05:00Z'), 'Asia/Riyadh')).toBe('2026/09/29 — 19:05');
  });
});
