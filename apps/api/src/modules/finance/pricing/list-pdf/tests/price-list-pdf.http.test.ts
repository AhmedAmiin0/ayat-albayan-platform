import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { fxRow } from '@/modules/finance/fx/fx.fakes';
import { pricingApp } from '@/modules/finance/pricing/pricing.test-app';

const REQUEST = '7f0c2b9e-6f4a-4c1d-9a51-2f3c8e1d4b60';
const URL = '/pricing/list-pdf';
let h: Awaited<ReturnType<typeof pricingApp>>;

beforeAll(async () => {
  h = await pricingApp();
});
afterAll(() => h.app.close());
beforeEach(() => {
  h.pdf.renderer.render.mockClear();
  h.pdf.storage.upload.mockClear();
  h.queries.newest.mockResolvedValue(fxRow({ rate: 0.25 }));
});

describe('POST /pricing/list-pdf', () => {
  it('a role without pricing.read gets 403 and nothing is printed', async () => {
    const res = await h.post(URL, { country: 'SA', clientRequestId: REQUEST }, 'teacher');
    expect(res.statusCode).toBe(403);
    expect(h.pdf.renderer.render).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { clientRequestId: 'nope' },
    { clientRequestId: REQUEST, students: 0 },
    { clientRequestId: REQUEST, discount: 101 },
  ])('body %o is 400', async (body) => {
    expect((await h.post(URL, body)).statusCode).toBe(400);
  });

  it('stores the PDF under the caller and request, and answers where it is', async () => {
    const res = await h.post(URL, { country: 'SA', discount: 10, clientRequestId: REQUEST });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({
      path: `out/admin-1/${REQUEST}/price-list.pdf`,
      url: 'https://files.test/p',
      filename: 'ayat-albayan-prices-sa.pdf',
    });
    expect(h.pdf.storage.upload).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: 'wa-media', body: h.pdf.bytes }),
    );
  });

  it('another country is listed in USD at the stored rate', async () => {
    await h.post(URL, { country: 'EG', clientRequestId: REQUEST });
    expect(h.pdf.renderer.render.mock.calls[0]?.[0]).toContain('دولار أمريكي ($)');
  });
});
