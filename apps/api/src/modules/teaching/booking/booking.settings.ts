import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../common/settings/settings-slice';
import { SettingsService } from '../../../common/settings/settings.service';

/**
 * BookingPlanner and CourseChangePlanner (horizon, meeting mode, invoice size), BookingParties and
 * MakeupCandidates (makeup window, R-SCH-10), SlotsService and TeacherOptionsQueries (24/7 grid, meeting
 * mode), BookingExtrasController (invoice size) and SalesBookingScope (sales_auto_assign). The teacher's
 * WhatsApp on a new student (R-NOT-03) is the teacher_new_student rule (NotificationPolicy).
 */
const KEYS = [
  'booking_horizon_weeks',
  'makeup_window_days',
  'teachers_always_available',
  'meeting_link_auto',
  'upload_max_mb',
  'sales_auto_assign',
] as const satisfies readonly SettingKey[];
export type BookingSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The academy settings the booking module reads (common/settings/settings-slice.ts). */
@Injectable()
export class BookingSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<BookingSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
