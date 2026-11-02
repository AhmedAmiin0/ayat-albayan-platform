import { settingDef, type SettingKey } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import {
  shapeParts,
  valueKind,
  valueTextBy,
  type ValueKind,
  type ValueTextTable,
} from '../../index.js';

const kindOf = (key: SettingKey, value: unknown): ValueKind => valueKind(settingDef(key), value);

describe('valueKind (the one classifier both apps word)', () => {
  it.each([
    ['academy_contact', { site: 'a.org' }, 'shape'],
    ['recording_consent_notice', null, 'shape'],
    ['meeting_link_auto', true, 'flag'],
    ['late_cancel_hours', null, 'empty'],
    ['booking_horizon_weeks', undefined, 'empty'],
    ['booking_horizon_weeks', 5, 'number'],
    ['follow_up_hours', [24, 72], 'list'],
    ['feedback_mode', 'link', 'choice'],
    ['academy_timezone', 'Africa/Cairo', 'zone'],
    ['reporting_currency', 'SAR', 'text'],
    ['default_meeting_title', 'حلقة', 'text'],
  ] as const)('%s %j → %s', (key, value, kind) => {
    expect(kindOf(key, value)).toBe(kind);
  });

  it('a json entry is a shape whatever it holds; an object elsewhere is a shape too', () => {
    expect(kindOf('academy_contact', 'x')).toBe('shape');
    expect(kindOf('reporting_currency', { a: 'b' })).toBe('shape');
  });
});

describe('valueTextBy', () => {
  const table = Object.fromEntries(
    (['shape', 'flag', 'empty', 'number', 'list', 'choice', 'zone', 'text'] as const).map((k) => [
      k,
      (key: SettingKey, value: unknown) => `${k}:${key}:${String(value)}`,
    ]),
  ) as ValueTextTable;

  it('runs the handler of the value kind with the key and the value', () => {
    expect(valueTextBy(table, 'booking_horizon_weeks', 5)).toBe('number:booking_horizon_weeks:5');
    expect(valueTextBy(table, 'feedback_mode', 'link')).toBe('choice:feedback_mode:link');
  });
});

describe('shapeParts', () => {
  it('named fields in order, only non-empty strings', () => {
    const value = { email: 'x@a.org', site: 'a.org', phone: '' };
    expect(shapeParts(value, ['site', 'phone', 'email', 'missing'])).toEqual(['a.org', 'x@a.org']);
  });

  it('every value without names; nothing for null, arrays and strings', () => {
    expect(shapeParts({ site: 'a.org', n: 3 })).toEqual(['a.org']);
    expect(shapeParts(null)).toEqual([]);
    expect(shapeParts(['a'])).toEqual([]);
    expect(shapeParts('a')).toEqual([]);
  });
});
