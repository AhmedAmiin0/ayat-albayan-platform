import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '@/common/settings/settings-slice';
import { SettingsService } from '@/common/settings/settings.service';

/**
 * The report footer's contact line (pdfContact): the site and the WhatsApp number; and the
 * teacher's edit window, after which the job renders and sends a report (docs/46 B3).
 */
const KEYS = [
  'academy_contact', 'academy_whatsapp_e164', 'report_teacher_edit_minutes',
] as const satisfies readonly SettingKey[];
export type ReportPdfSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The report PDF's academy settings (docs/25 §4), read by ReportPdfPublisher and ReportPdfQueries. One cached store.all(), only these keys. */
@Injectable()
export class ReportPdfSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<ReportPdfSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
