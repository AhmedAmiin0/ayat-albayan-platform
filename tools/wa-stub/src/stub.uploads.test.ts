import { afterEach, describe, expect, it } from 'vitest';
import { closeAll, startStub, startUpload, uploadPdf } from './test-server.ts';

afterEach(closeAll);

const PDF = new Uint8Array(Buffer.from('%PDF-1.4\n%%EOF\n'));
const PDF_QUERY = { file_name: 'sample.pdf', file_length: String(PDF.length), file_type: 'application/pdf' };
const OAUTH = { authorization: 'OAuth test-token', file_offset: '0' };
const code = async (res: Response) => [res.status, ((await res.json()) as { error: { code: number } }).error.code];

async function session(url: string): Promise<string> {
  return ((await (await startUpload(url, PDF_QUERY)).json()) as { id: string }).id;
}

describe('wa-stub: resumable upload (template header samples)', () => {
  it('a session on the app, then the bytes with OAuth at offset 0 → a handle the stub remembers', async () => {
    const { url, stub } = await startStub({ accessToken: 'test-token' });
    const id = await session(url);
    expect(id).toMatch(/^upload:[a-f0-9]+\?sig=stub[a-f0-9-]+$/);
    const res = await fetch(`${url}/v21.0/${id}`, { method: 'POST', headers: OAUTH, body: PDF });
    const { h } = (await res.json()) as { h: string };
    expect([res.status, h]).toEqual([200, expect.stringMatching(/^4::/)]);
    expect(stub.state.handles.has(h)).toBe(true);
    expect(stub.state.uploads.size).toBe(0);
    await expect(uploadPdf(url, PDF)).resolves.toMatch(/^4::/);
  });

  it('starting a session: bearer required; file_name, a byte count and a supported type checked', async () => {
    const { url } = await startStub();
    expect((await startUpload(url, PDF_QUERY, {})).status).toBe(401);
    expect(await code(await startUpload(url, { ...PDF_QUERY, file_name: '' }))).toEqual([400, 100]);
    expect(await code(await startUpload(url, { ...PDF_QUERY, file_length: '0' }))).toEqual([400, 100]);
    expect(await code(await startUpload(url, { ...PDF_QUERY, file_type: 'text/html' }))).toEqual([400, 100]);
  });

  it('sending the bytes: OAuth (not Bearer), file_offset 0, the announced length, the session sig', async () => {
    const { url, stub } = await startStub();
    const id = await session(url);
    const send = (headers: Record<string, string>, body: Uint8Array<ArrayBuffer> = PDF, path = id) =>
      fetch(`${url}/v21.0/${path}`, { method: 'POST', headers, body });
    expect((await send({ authorization: 'Bearer test-token', file_offset: '0' })).status).toBe(401);
    expect(await code(await send({ authorization: 'OAuth test-token' }))).toEqual([400, 100]);
    expect(await code(await send({ ...OAUTH, file_offset: '5' }))).toEqual([400, 100]);
    expect(await code(await send(OAUTH, PDF.subarray(1)))).toEqual([400, 100]);
    expect(await code(await send(OAUTH, PDF, id.replace(/sig=.*$/, 'sig=forged')))).toEqual([400, 100]);
    expect(stub.state.handles.size).toBe(0);
    expect((await send(OAUTH)).status).toBe(200);
  });

  it('reset forgets sessions and handles', async () => {
    const { url, stub } = await startStub();
    await uploadPdf(url, PDF);
    await session(url);
    await fetch(`${url}/__stub/reset`, { method: 'POST' });
    expect([stub.state.uploads.size, stub.state.handles.size]).toEqual([0, 0]);
  });
});
