import { describe, expectTypeOf, it } from 'vitest';
import type { BookingMode } from './booking-mode';

describe('BookingMode', () => {
  it('is the admin or the sales booking', () => {
    expectTypeOf<BookingMode>().toEqualTypeOf<'admin' | 'sales'>();
  });
});
