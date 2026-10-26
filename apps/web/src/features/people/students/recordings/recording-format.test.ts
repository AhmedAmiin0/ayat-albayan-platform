import { describe, expect, it } from 'vitest';
import { durationText, sizeText } from './recording-format';
import { t } from '@/lib/i18n/i18n';

describe('durationText', () => {
  it('minutes:seconds under an hour, h:mm:ss over, Western digits', () => {
    expect(durationText(750)).toBe('12:30');
    expect(durationText(3725)).toBe('1:02:05');
    expect(durationText(0)).toBe('0:00');
  });

  it('unknown is a dash', () => {
    expect(durationText(null)).toBe(t.studentRecordings.unknown);
  });
});

describe('sizeText', () => {
  it('whole megabytes below a gigabyte (at least 1), one decimal above', () => {
    expect(sizeText(52_428_800)).toBe(t.studentRecordings.sizeMb.replace('{n}', '50'));
    expect(sizeText(10)).toBe(t.studentRecordings.sizeMb.replace('{n}', '1'));
    expect(sizeText(1_288_490_189)).toBe(t.studentRecordings.sizeGb.replace('{n}', '1.2'));
  });

  it('unknown is a dash', () => {
    expect(sizeText(null)).toBe(t.studentRecordings.unknown);
  });
});
