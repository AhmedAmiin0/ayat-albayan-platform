import { describe, expect, it } from 'vitest';
import { scriptedFetch } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { instanceQr, instanceState } from './evolution-instance';
import { evolutionMedia } from './evolution-media';
import { EVO_BAILEYS, EVO_CLOUD } from './evolution.fakes';

// docs/19 «Evolution driver»: connectionState, the QR, and inbound media, zod-checked.

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('Evolution instance calls', () => {
  it('connectionState: GET with the instance token; an unknown state reads null', async () => {
    const f = scriptedFetch({ status: 200, body: { instance: { instanceName: 'secondary-1', state: 'open' } } });
    await expect(instanceState({ env: EVO_BAILEYS, fetch: f.fetch })).resolves.toBe('open');
    expect(f.requests[0]?.url).toBe('https://evo.example.test/instance/connectionState/secondary-1');
    expect(f.requests[0]?.init.headers).toMatchObject({ apikey: 'fake-instance-token' });
    const odd = scriptedFetch({ status: 200, body: { instance: { state: 'weird' } } });
    await expect(instanceState({ env: EVO_BAILEYS, fetch: odd.fetch })).resolves.toBeNull();
  });

  it('connect: a PNG data URL is passed on; anything else is dropped', async () => {
    const f = scriptedFetch(
      { status: 200, body: { base64: PNG, pairingCode: 'ABCD1234', code: 'raw', count: 1 } },
      { status: 200, body: { base64: 'https://evil.example/qr.png' } },
    );
    const want = { state: 'connecting', qr: PNG, pairingCode: 'ABCD1234' };
    await expect(instanceQr({ env: EVO_BAILEYS, fetch: f.fetch })).resolves.toEqual(want);
    const other = await instanceQr({ env: EVO_BAILEYS, fetch: f.fetch });
    expect(other.qr).toBeNull();
  });

  it('connect on an open instance answers its state and no QR', async () => {
    const f = scriptedFetch({ status: 200, body: { instance: { instanceName: 'secondary-1', state: 'open' } } });
    await expect(instanceQr({ env: EVO_BAILEYS, fetch: f.fetch })).resolves.toEqual({ state: 'open', qr: null, pairingCode: null });
  });
});

describe('Evolution inbound media', () => {
  it('Baileys: the bytes by message id from getBase64FromMediaMessage', async () => {
    const f = scriptedFetch({ status: 201, body: { base64: Buffer.from('%PDF').toString('base64'), mimetype: 'application/pdf' } });
    const media = await evolutionMedia({ env: EVO_BAILEYS, fetch: f.fetch, timeoutMs: 1_000 }, 'EVO-IN-1');
    expect(Buffer.from(media.bytes).toString()).toBe('%PDF');
    expect(media.mime).toBe('application/pdf');
    expect(f.requests[0]?.url).toBe('https://evo.example.test/chat/getBase64FromMediaMessage/secondary-1');
    expect(f.requests[0]?.body).toEqual({ message: { key: { id: 'EVO-IN-1' } }, convertToMp4: false });
  });

  it('Cloud: not supported by id alone, no request', async () => {
    const f = scriptedFetch();
    const p = evolutionMedia({ env: EVO_CLOUD, fetch: f.fetch, timeoutMs: 1_000 }, 'x');
    await expect(p).rejects.toMatchObject({ info: { unsupported: 'evolution' } });
    expect(f.requests).toHaveLength(0);
  });
});
