import { describe, expect, it } from 'vitest';
import { reportPublicRoutes as routes } from '..';

const PUBLIC_ID = 'a'.repeat(32);
const BASE = '/public/report-pages/:publicId';

describe('reportPublicRoutes', () => {
  it('keeps the paths the api serves today', () => {
    expect(Object.values(routes).map((r) => `${r.method} ${r.path}`)).toEqual([
      `GET ${BASE}`,
      `GET ${BASE}/access`,
      `POST ${BASE}/code`,
      `POST ${BASE}/verify`,
    ]);
  });

  it('needs no permission and files every route under reports', () => {
    expect(Object.values(routes).some((r) => 'permissions' in r)).toBe(false);
    expect(Object.values(routes).every((r) => r.tags.join() === 'reports')).toBe(true);
  });

  it('takes only a 32-hex public id', () => {
    expect(routes.view.params.parse({ publicId: PUBLIC_ID })).toEqual({ publicId: PUBLIC_ID });
    expect(routes.access.params.safeParse({ publicId: 'A'.repeat(32) }).success).toBe(false);
    expect(routes.code.params.safeParse({ publicId: 'a'.repeat(31) }).success).toBe(false);
  });

  it('sends a code only to a number on file and folds the typed code', () => {
    expect(routes.code.body.safeParse({ to: 'family' }).success).toBe(true);
    expect(routes.code.body.safeParse({ to: '+15550000001' }).success).toBe(false);
    expect(routes.verify.body.parse({ code: '١٢٣ ٤٥٦' })).toEqual({ code: '123456' });
    expect(routes.verify.body.safeParse({ code: '12345' }).success).toBe(false);
  });

  it('answers the masked numbers, and nothing for the code steps', () => {
    const access = { available: true, to: [{ to: 'teacher', masked: '••••01' }] };
    expect(routes.access.response.parse(access)).toEqual(access);
    expect(routes.access.response.safeParse({ to: [] }).success).toBe(false);
    expect([routes.code.response, routes.verify.response]).toEqual(['empty', 'empty']);
  });
});
