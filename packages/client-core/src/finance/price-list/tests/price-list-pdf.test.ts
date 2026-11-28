import { pricingRoutes } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { priceListPdfBody } from '../price-list-pdf';

const id = '7f0c2b9e-6f4a-4c1d-9a51-2f3c8e1d4b60';

describe('priceListPdfBody', () => {
  it('is the list query of the same choice plus the request id, as the route takes it', () => {
    const choice = { country: 'om', students: 3, discount: 5, rounding: 'up' as const };
    const body = priceListPdfBody(choice, id);
    expect(body).toEqual({
      country: 'OM',
      students: 3,
      discount: 5,
      rounding: 'up',
      clientRequestId: id,
    });
    expect(pricingRoutes.listPdf.body.safeParse(body).success).toBe(true);
  });

  it('leaves another country out, so the PDF is in USD like the list', () => {
    const choice = { country: 'other', students: 1, discount: 0, rounding: 'nearest' as const };
    expect(priceListPdfBody(choice, id).country).toBeUndefined();
  });
});
