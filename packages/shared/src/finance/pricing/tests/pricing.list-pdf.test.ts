import { describe, expect, it } from 'vitest';
import { pricingRoutes } from '../pricing.routes';

const id = '7f0c2b9e-6f4a-4c1d-9a51-2f3c8e1d4b60';
const body = pricingRoutes.listPdf.body;
const answer = pricingRoutes.listPdf.response;

describe('pricingRoutes.listPdf', () => {
  it('takes the price list choice and the request id that names the file', () => {
    const parsed = body.parse({ country: 'kw', students: 2, discount: 10, clientRequestId: id });
    expect(parsed).toEqual({ country: 'KW', students: 2, discount: 10, clientRequestId: id });
  });

  it('defaults like the list: one student, no discount, rounding left out', () => {
    expect(body.parse({ clientRequestId: id })).toEqual({
      students: 1,
      discount: 0,
      clientRequestId: id,
    });
  });

  it.each([
    { students: 1 },
    { clientRequestId: 'not-a-uuid' },
    { clientRequestId: id, discount: 101 },
    { clientRequestId: id, country: 'SAU' },
    { clientRequestId: id, rounding: 'half' },
  ])('refuses %o', (input) => {
    expect(body.safeParse(input).success).toBe(false);
  });

  it('answers the stored path, a link to open it and the name the chat shows', () => {
    const pdf = { path: `out/a/${id}/price-list.pdf`, url: 'https://x.test/f', filename: 'a.pdf' };
    expect(answer.parse(pdf)).toEqual(pdf);
    expect(answer.safeParse({ ...pdf, url: 'not a url' }).success).toBe(false);
  });
});
