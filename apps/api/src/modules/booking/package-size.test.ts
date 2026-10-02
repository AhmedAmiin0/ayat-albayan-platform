import { PACKAGE_IDS, PACKAGE_SIZES } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { packageSizeOf, withPackageSize } from './package-size';

describe('packageSizeOf (docs/08 catalog → package_size)', () => {
  it('maps every catalog package to its lesson count', () => {
    expect(Object.fromEntries(PACKAGE_IDS.map((id) => [id, packageSizeOf(id)]))).toEqual({
      starter: '8',
      standard: '12',
      premium: '16',
      bulk: '28',
      weekly: '4',
      monthly: '20',
    });
  });

  it('every mapped size is a valid package_size', () => {
    for (const id of PACKAGE_IDS) expect(PACKAGE_SIZES).toContain(packageSizeOf(id));
  });
});

describe('withPackageSize (POST /booking body)', () => {
  it('rewrites a catalog id', () => {
    expect(withPackageSize({ package: 'bulk', teacherId: 'T' })).toEqual({ package: '28', teacherId: 'T' });
  });

  it('passes package sizes, unknown values and non-objects through untouched', () => {
    expect(withPackageSize({ package: 'trial' })).toEqual({ package: 'trial' });
    expect(withPackageSize({ package: 'gold' })).toEqual({ package: 'gold' });
    expect(withPackageSize({ teacherId: 'T' })).toEqual({ teacherId: 'T' });
    expect(withPackageSize(null)).toBeNull();
    expect(withPackageSize('x')).toBe('x');
  });
});
