import { describe, expect, it } from 'vitest';
import { qrMatrix, qrPath, qrSide, QR_QUIET_ZONE } from './qr';

const url = 'https://app.ayatalbayan.com/l/K7q2M9xT';

describe('qrMatrix', () => {
  it('is a square of a QR version size, without a border', () => {
    const m = qrMatrix(url);
    expect((m.length - 17) % 4).toBe(0);
    expect(m.every((row) => row.length === m.length)).toBe(true);
    // The finder pattern's dark corner sits at (0, 0) when there is no border.
    expect(m[0]?.slice(0, 7)).toEqual(Array.from({ length: 7 }, () => true));
  });

  it('is deterministic and grows with the error correction', () => {
    expect(qrMatrix(url)).toEqual(qrMatrix(url));
    expect(qrMatrix(url, 'H').length).toBeGreaterThan(qrMatrix(url, 'L').length);
  });
});

describe('qrPath', () => {
  it('draws one rectangle per dark run, shifted by the quiet zone', () => {
    const m = [
      [true, true, false],
      [false, true, true],
      [true, false, true],
    ];
    expect(qrPath(m, 1)).toBe(
      'M1 1h2v1h-2zM2 2h2v1h-2zM1 3h1v1h-1zM3 3h1v1h-1z',
    );
    expect(qrSide(m, 1)).toBe(5);
    expect(qrSide(m)).toBe(3 + 2 * QR_QUIET_ZONE);
  });

  it('draws nothing for a light matrix', () => {
    expect(qrPath([[false, false]])).toBe('');
  });
});
