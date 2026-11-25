import type { DynamicModule } from '@nestjs/common';
import { messagingRoot } from '@/common/infra/test-root';
import { BookingModule } from './booking.module';

/** The booking routes' test root: BookingModule on the real messaging globals. */
export const bookingRoot = (): DynamicModule => messagingRoot(BookingModule);
