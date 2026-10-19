import { afterEach, describe, expect, it } from 'vitest';
import { closeAll, post, startStub } from './test-server.ts';

afterEach(closeAll);

const MSG = '/v21.0/PHONE/messages';
const to = '+966500000001';
const code = async (res: Response) => ((await res.json()) as { error: { code: number } }).error.code;

describe('wa-stub: outbound media (owner 2026-10-19 #2)', () => {
  it('an image or a document without link or id gets 400 with Meta code 100, and is not logged', async () => {
    const { url, stub } = await startStub({ enforceWindow: false });
    const image = await post(`${url}${MSG}`, { to, type: 'image', image: { caption: 'x' } });
    expect(image.status).toBe(400);
    expect(await code(image)).toBe(100);
    const doc = await post(`${url}${MSG}`, { to, type: 'document', document: { filename: 'a.pdf' } });
    expect(doc.status).toBe(400);
    expect(await code(doc)).toBe(100);
    expect(stub.sent).toHaveLength(0);
  });

  it('an image by link and a document by id go through and are logged with their type', async () => {
    const { url, stub } = await startStub({ enforceWindow: false });
    const image = { to, type: 'image', image: { link: 'https://x/a.png', caption: 'صورة' } };
    expect((await post(`${url}${MSG}`, image)).status).toBe(200);
    expect((await post(`${url}${MSG}`, { to, type: 'document', document: { id: 'MEDIA1' } })).status).toBe(200);
    expect(stub.sent.map((s) => s.type)).toEqual(['image', 'document']);
    expect(stub.sent[0]?.body).toMatchObject({ image: { link: 'https://x/a.png' } });
  });

  it('a media error is answered before the window check', async () => {
    const { url } = await startStub();
    expect(await code(await post(`${url}${MSG}`, { to, type: 'image', image: {} }))).toBe(100);
  });
});
