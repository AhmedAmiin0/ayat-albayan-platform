import { PACKAGE_IDS, PACKAGE_SIZES } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { bookingBodySchema, packageSizeOf, withPackageSize } from './package-size';

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

describe('bookingBodySchema (the ZodBody of POST /booking, /check and the trial-date routes)', () => {
  const body = {
    teacherId: 'a0000000-0000-4000-8000-000000000001',
    byday: [0],
    startTimeLocal: '17:00',
    tz: 'Asia/Riyadh',
    durationMin: 30,
    startsOn: '2099-10-11',
    studentIds: ['c0000000-0000-4000-8000-000000000001'],
  };

  it('rewrites a catalog id before the booking schema reads it', () => {
    expect(bookingBodySchema.parse({ ...body, package: 'bulk' }).package).toBe('28');
  });

  it('fails like bookingRequestSchema on an unknown package or a bad body', () => {
    expect(bookingBodySchema.safeParse({ ...body, package: 'gold' }).success).toBe(false);
    expect(bookingBodySchema.safeParse(null).success).toBe(false);
  });
});
