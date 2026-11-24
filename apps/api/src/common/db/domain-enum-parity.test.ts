import type { Enums, Json as DbJson } from '@ab/db';
import type { LessonRating } from '@ab/shared';
import type { GoogleSyncKind, GoogleSyncState } from '@ab/catalog';
import type { Json } from '@ab/core';
import type { AssistantCommissionStatus, AssistantCommissionType, EarningStatus } from '@ab/money';
import type { BookingKind } from '@ab/schedule';
import { describe, expectTypeOf, it } from 'vitest';

describe('schedule, money and messaging enums match the DB enums', () => {
  it('bookings, commissions and earnings', () => {
    expectTypeOf<BookingKind>().toEqualTypeOf<Enums<'booking_kind'>>();
    expectTypeOf<AssistantCommissionType>().toEqualTypeOf<Enums<'assistant_commission_type'>>();
    expectTypeOf<AssistantCommissionStatus>().toEqualTypeOf<
      Enums<'assistant_commission_status'>
    >();
    expectTypeOf<EarningStatus>().toEqualTypeOf<Enums<'teacher_earning_status'>>();
  });

  it('ratings and google sync', () => {
    expectTypeOf<LessonRating>().toEqualTypeOf<Enums<'feedback_quick_rating'>>();
    expectTypeOf<GoogleSyncKind>().toEqualTypeOf<Enums<'google_sync_kind'>>();
    expectTypeOf<GoogleSyncState>().toEqualTypeOf<Enums<'google_sync_state'>>();
  });

  it('core Json is the DB Json', () => {
    expectTypeOf<Json>().toEqualTypeOf<DbJson>();
  });
});
