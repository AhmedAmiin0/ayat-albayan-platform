import { afterEach, describe, expect, it } from 'vitest';
import { bearer, closeAll, post, startHook, startStub, TWO_LINES } from './test-server.ts';

afterEach(closeAll);

const AUTH = { headers: bearer(TWO_LINES.accessToken) };
const json = async <T>(res: Response) => (await res.json()) as T;
type Apps = { data: { whatsapp_business_api_data: Record<string, string> }[] };

describe('wa-stub: line diagnostics (docs/12 §13.9, §13.12)', () => {
  it('GET /{phone_number_id}?fields= answers only the requested fields, with the id', async () => {
    const { url } = await startStub(TWO_LINES);
    const res = await fetch(`${url}/v21.0/PN-C?fields=status,quality_rating,unknown_field`, AUTH);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'PN-C', status: 'CONNECTED', quality_rating: 'GREEN' });
  });

  it('without fields= it answers the six diagnostics fields', async () => {
    const { url } = await startStub(TWO_LINES);
    const info = await json<Record<string, string>>(await fetch(`${url}/v21.0/PN-N`, AUTH));
    expect(Object.keys(info).sort()).toEqual(
      ['id', 'display_phone_number', 'verified_name', 'quality_rating', 'status', 'name_status', 'code_verification_status'].sort(),
    );
    expect(info['display_phone_number']).toBe('+15550001111');
  });

  it('GET /{waba}/subscribed_apps lists the line app; an unknown WABA is 400', async () => {
    const { url } = await startStub(TWO_LINES);
    const apps = await json<Apps>(await fetch(`${url}/v21.0/WABA-C/subscribed_apps`, AUTH));
    expect(apps.data).toHaveLength(1);
    expect(apps.data[0]?.whatsapp_business_api_data).toMatchObject({ id: 'APP-C', name: expect.any(String), link: expect.any(String) });
    expect(apps.data[0]?.whatsapp_business_api_data).not.toHaveProperty('override_callback_uri');
    expect((await fetch(`${url}/v21.0/WABA-X/subscribed_apps`, AUTH)).status).toBe(400);
  });

  it('POST /__stub/lines/{pn} toggles subscribed and health; reset restores', async () => {
    const { url } = await startStub(TWO_LINES);
    const patch = { subscribed: false, status: 'FLAGGED', quality_rating: 'RED', override_callback_uri: 'https://crm.example/hook' };
    expect((await post(`${url}/__stub/lines/PN-N`, patch, {})).status).toBe(200);
    expect(await json<Apps>(await fetch(`${url}/v21.0/WABA-N/subscribed_apps`, AUTH))).toEqual({ data: [] });
    const info = await json<Record<string, string>>(await fetch(`${url}/v21.0/PN-N?fields=status,quality_rating`, AUTH));
    expect(info).toEqual({ id: 'PN-N', status: 'FLAGGED', quality_rating: 'RED' });
    await post(`${url}/__stub/lines/PN-N`, { subscribed: true }, {});
    const back = await json<Apps>(await fetch(`${url}/v21.0/WABA-N/subscribed_apps`, AUTH));
    expect(back.data[0]?.whatsapp_business_api_data['override_callback_uri']).toBe('https://crm.example/hook');
    await post(`${url}/__stub/reset`, {});
    expect(await json<Record<string, string>>(await fetch(`${url}/v21.0/PN-N?fields=status`, AUTH))).toEqual({ id: 'PN-N', status: 'CONNECTED' });
    const reset = await json<Apps>(await fetch(`${url}/v21.0/WABA-N/subscribed_apps`, AUTH));
    expect(reset.data[0]?.whatsapp_business_api_data).not.toHaveProperty('override_callback_uri');
    expect((await post(`${url}/__stub/lines/PN-X`, { subscribed: false }, {})).status).toBe(404);
  });

  it('the media lookup on GET /{id} still resolves for an id that is not a number', async () => {
    const hook = await startHook();
    const { url } = await startStub({ ...TWO_LINES, webhookUrl: hook.url });
    const media = { kind: 'image', mime: 'image/png', base64: Buffer.from('PNG').toString('base64') };
    const { mediaId } = await json<{ mediaId: string }>(await post(`${url}/__stub/inbound`, { from: '966500000004', media }));
    const meta = await json<{ id: string; mime_type: string }>(await fetch(`${url}/v21.0/${mediaId}`, AUTH));
    expect(meta).toMatchObject({ id: mediaId, mime_type: 'image/png' });
    expect((await fetch(`${url}/v21.0/nope`, AUTH)).status).toBe(404);
  });

  it('diagnostics need a bearer like every Graph call', async () => {
    const { url } = await startStub(TWO_LINES);
    expect((await fetch(`${url}/v21.0/PN-N`)).status).toBe(401);
    expect((await fetch(`${url}/v21.0/WABA-N/subscribed_apps`)).status).toBe(401);
  });
});
