import type { ShortLinkGateView } from '@ab/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { linksApp } from '@/modules/platform/short-links-admin/short-links-admin.app.fakes';
import type { GateService } from './gate.service';
import { GatePublicController } from './gate.controller';
import { IS_PUBLIC, OWN_PUBLIC } from '@/common/auth/decorators';

const view: ShortLinkGateView = {
  title: 'حلقة',
  state: 'open',
  goneReason: null,
  needs: 'sign_in_or_code',
  codesAvailable: true,
};
const asked = { params: { code: 'Mg12Cd34Ef' }, query: undefined, body: undefined };
const serving = (answer: object) =>
  new GatePublicController({ view: async () => answer } as unknown as GateService);

describe('GET /public/short-links/:code', () => {
  it('answers the gate view', async () => {
    expect(await serving(view).view(asked)).toEqual(view);
  });

  it('a view outside the shared schema is a 500 response_invalid', async () => {
    const odd = serving({ ...view, state: 'closed' });
    await expect(odd.view(asked)).rejects.toMatchObject({
      response: { code: 'response_invalid' },
    });
  });
});

describe('the gate routes over http', () => {
  let t: Awaited<ReturnType<typeof linksApp>>;
  beforeAll(async () => {
    t = await linksApp();
  });
  afterAll(() => t.app.close());

  it('a code the server never makes is the one 404 short_link_not_found', async () => {
    const res = await t.call({ method: 'GET', url: '/public/short-links/no', token: 'guardian' });
    expect([res.statusCode, res.json<{ code: string }>().code]).toEqual([
      404,
      'short_link_not_found',
    ]);
  });

  it('a phone that is not E.164 is a 400 before any code is sent', async () => {
    const url = '/public/short-links/Mg12Cd34Ef/otp/start';
    const res = await t.call({ method: 'POST', url, token: 'guardian', payload: { phone: '0' } });
    expect(res.statusCode).toBe(400);
    expect(t.system.row).not.toHaveBeenCalled();
  });
});

describe('gate access', () => {
  const steps = ['view', 'start', 'verify'].map((name): object =>
    Object(Reflect.get(GatePublicController.prototype, name)),
  );
  const marked = (key: string) => steps.map((step) => Reflect.getOwnMetadata(key, step));

  it('opens the view and the code steps from their route objects, not from the class', () => {
    expect(Reflect.getOwnMetadata(IS_PUBLIC, GatePublicController)).toBeUndefined();
    expect(marked(IS_PUBLIC)).toEqual([true, true, true]);
    expect(marked(OWN_PUBLIC)).toEqual([undefined, undefined, undefined]);
  });
});
