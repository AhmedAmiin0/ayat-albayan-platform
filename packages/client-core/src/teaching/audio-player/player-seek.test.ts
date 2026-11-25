import { describe, expect, it } from 'vitest';
import { seekAtPoint, seekByKey } from '.';

const at = { position: 30, duration: 100 };

describe('seekByKey', () => {
  it('moves ±10 s, the horizontal arrows by the page direction', () => {
    expect(seekByKey({ ...at, key: 'ArrowRight', rtl: false })).toBe(40);
    expect(seekByKey({ ...at, key: 'ArrowRight', rtl: true })).toBe(20);
    expect(seekByKey({ ...at, key: 'ArrowLeft', rtl: true })).toBe(40);
    expect(seekByKey({ ...at, key: 'ArrowDown', rtl: true })).toBe(20);
    expect(seekByKey({ ...at, key: 'PageUp', rtl: false })).toBe(40);
  });

  it('jumps to the ends, stays in the file, ignores other keys', () => {
    expect(seekByKey({ ...at, key: 'Home', rtl: true })).toBe(0);
    expect(seekByKey({ ...at, key: 'End', rtl: true })).toBe(100);
    expect(seekByKey({ position: 95, duration: 100, key: 'ArrowUp', rtl: false })).toBe(100);
    expect(seekByKey({ ...at, key: 'Enter', rtl: false })).toBeNull();
  });
});

describe('seekAtPoint', () => {
  it('lands on the share of the bar, mirrored in a right-to-left page', () => {
    expect(seekAtPoint({ x: 25, width: 100, duration: 200, rtl: false })).toBe(50);
    expect(seekAtPoint({ x: 25, width: 100, duration: 200, rtl: true })).toBe(150);
    expect(seekAtPoint({ x: -5, width: 100, duration: 200, rtl: false })).toBe(0);
    expect(seekAtPoint({ x: 10, width: 0, duration: 200, rtl: false })).toBe(0);
  });
});
