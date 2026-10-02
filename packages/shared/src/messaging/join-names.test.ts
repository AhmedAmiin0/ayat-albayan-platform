import { describe, expect, it } from 'vitest';
import { joinNames } from './booking-confirmation.js';

describe('joinNames ({{1}}, R-MSG-01)', () => {
  it('one name stays as is', () => {
    expect(joinNames(['سهيلة'])).toBe('سهيلة');
  });

  it('attaches و to the last name, as the engine always did', () => {
    expect(joinNames(['سهيلة', 'مريم'])).toBe('سهيلة ومريم');
  });

  it('three names: each joined with an attached و', () => {
    expect(joinNames(['سهيلة', 'مريم', 'ليان'])).toBe('سهيلة ومريم وليان');
  });
});
