import { describe, expect, it } from 'vitest';
import { evolutionQrSchema, qrImageOf, shownState } from './evolution-api';

describe('evolution-api', () => {
  it('qrImageOf keeps a PNG data URL only', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    expect(qrImageOf(png)).toBe(png);
    expect(qrImageOf('data:image/svg+xml;base64,PHN2Zz4=')).toBeNull();
    expect(qrImageOf('https://example.test/qr.png')).toBeNull();
    expect(qrImageOf(null)).toBeNull();
  });

  it('an unknown state word reads as unknown', () => {
    const answer = evolutionQrSchema.parse({ state: 'banana', qr: null, pairing_code: null });
    expect(answer.state).toBeNull();
    expect(shownState(answer.state)).toBe('unknown');
    expect(shownState('open')).toBe('open');
  });
});
