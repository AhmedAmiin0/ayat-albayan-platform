import { formatPhone } from '@ab/core';
import { describe, expect, it } from 'vitest';
import { footerContact } from '@/modules/finance/pricing/list-pdf/price-list-pdf.settings';

const PHONE = '+15555550100';

describe('footerContact', () => {
  it('the grouped WhatsApp number and the site from the settings', () => {
    const contact = footerContact({
      academy_whatsapp_e164: PHONE,
      academy_contact: { site: 'example.test' },
    });
    expect(contact).toEqual({ whatsapp: formatPhone(PHONE), site: 'example.test' });
  });

  it('no site set leaves the site out', () => {
    const contact = footerContact({ academy_whatsapp_e164: PHONE, academy_contact: {} });
    expect(contact).toEqual({ whatsapp: formatPhone(PHONE) });
  });
});
