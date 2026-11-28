import { formatPhone } from '@ab/core';
import type { SettingKey } from '@ab/settings';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '@/common/settings/settings-slice';
import { SettingsService } from '@/common/settings/settings.service';
import type { PdfFooterContact } from './price-list-pdf.types';

const KEYS = ['academy_contact', 'academy_whatsapp_e164'] as const satisfies readonly SettingKey[];
type Values = SettingsSlice<(typeof KEYS)[number]>;

/** The footer's sales line: the academy's one WhatsApp number and its site, never typed in code. */
export function footerContact(s: Values): PdfFooterContact {
  const { site } = s.academy_contact;
  return { whatsapp: formatPhone(s.academy_whatsapp_e164), ...(site ? { site } : {}) };
}

@Injectable()
export class PriceListPdfSettings {
  constructor(private readonly store: SettingsService) {}

  async contact(): Promise<PdfFooterContact> {
    return footerContact(await readSlice(this.store, KEYS));
  }
}
