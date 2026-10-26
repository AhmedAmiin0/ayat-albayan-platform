import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../common/settings/settings-slice';
import { SettingsService } from '../../../common/settings/settings.service';

/** The report footer's contact line (pdfContact): the site and the WhatsApp number. */
const KEYS = ['academy_contact', 'academy_whatsapp_e164'] as const satisfies readonly SettingKey[];
export type ReportPdfSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The report PDF's academy settings (docs/25 §4), read by ReportPdfPublisher. One cached store.all(), only these keys. */
@Injectable()
export class ReportPdfSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<ReportPdfSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
