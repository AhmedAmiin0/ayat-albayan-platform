import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '@/common/settings/settings-slice';
import { SettingsService } from '@/common/settings/settings.service';

/**
 * RulePlanner (horizon), LessonCancelService and LessonStatusService (late cancel, R-SCH-07),
 * OverviewQueries (24/7 grid), TeacherMeQueries and LessonsQueries (meeting mode), LessonsController
 * (day view zone), TimeEditPayout (which statuses are paid, R-PAY-02) and AutoHeldService (whether
 * a lesson needs a confirmation, owner 2026-11-02), LessonViews (the report edit window, docs/46 B7).
 */
const KEYS = [
  'booking_horizon_weeks',
  'late_cancel_hours',
  'teachers_always_available',
  'meeting_link_auto',
  'academy_timezone',
  'payout_count_late',
  'payout_count_no_show',
  'lesson_confirmation_required',
  'lesson_outcome_grace_minutes',
  'report_teacher_edit_minutes',
] as const satisfies readonly SettingKey[];
export type LessonsSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The academy settings the lessons module reads (common/settings/settings-slice.ts). */
@Injectable()
export class LessonsSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<LessonsSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
