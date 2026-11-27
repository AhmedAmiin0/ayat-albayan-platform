import { describe, expect, it } from 'vitest';
import { qrImageOf, shownState } from './evolution-api';

describe('evolution-api', () => {
  it('qrImageOf keeps a PNG data URL only', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    expect(qrImageOf(png)).toBe(png);
    expect(qrImageOf('data:image/svg+xml;base64,PHN2Zz4=')).toBeNull();
    expect(qrImageOf('https://example.test/qr.png')).toBeNull();
    expect(qrImageOf(null)).toBeNull();
  });

  it('a state the server could not name reads as unknown', () => {
    expect(shownState(null)).toBe('unknown');
    expect(shownState('open')).toBe('open');
  });
});
