import { describe, expect, it } from 'vitest';
import { APP_ENV, RECORDED_UPLOAD, REPORT_READY_SEED } from './templates/catalog/seed-templates.fakes';
import { SAMPLE_REPORT } from './template-review';
import { HttpWhatsappClient } from './whatsapp.client';
import { scriptedFetch, STUB_ENV } from './whatsapp.fakes';
import { WaError } from './whatsapp.types';

const HANDLE = RECORDED_UPLOAD.handle.body.h;

function client(env: typeof STUB_ENV, ...replies: Parameters<typeof scriptedFetch>) {
  const f = scriptedFetch(...replies);
  return { c: new HttpWhatsappClient(env, { fetch: f.fetch, timeoutMs: 1_000 }), requests: f.requests };
}

describe('HttpWhatsappClient.uploadSample: Resumable Upload API against recorded wa-stub answers', () => {
  it('opens a session on the app (bearer), then posts the raw bytes to the session id with OAuth at offset 0', async () => {
    const { c, requests } = client(APP_ENV, RECORDED_UPLOAD.session, RECORDED_UPLOAD.handle);
    expect(c.canUploadSamples()).toBe(true);
    await expect(c.uploadSample(SAMPLE_REPORT)).resolves.toBe(HANDLE);
    const [start, bytes] = requests;
    const length = SAMPLE_REPORT.bytes.byteLength;
    expect(start?.url).toBe(`http://127.0.0.1:4010/v21.0/stub-app/uploads?file_name=lesson-report-sample.pdf&file_length=${length}&file_type=application%2Fpdf`);
    expect([start?.init.method, start?.init.body]).toEqual(['POST', undefined]);
    expect(start?.init.headers).toEqual({ authorization: 'Bearer test-token' });
    // The session id is the path as Meta gave it, `?sig=` included, never re-encoded.
    expect(bytes?.url).toBe('http://127.0.0.1:4010/v21.0/upload:8343d89e280548838554f260de294898?sig=stub277cd412');
    expect(bytes?.init.headers).toEqual({ authorization: 'OAuth test-token', file_offset: '0' });
    expect(bytes?.init.body).toBe(SAMPLE_REPORT.bytes);
  });

  it('without WA_APP_ID: canUploadSamples is false and uploadSample throws before any request', async () => {
    const { c, requests } = client(STUB_ENV);
    expect(c.canUploadSamples()).toBe(false);
    await expect(c.uploadSample(SAMPLE_REPORT)).rejects.toMatchObject({ info: { code: null, status: 0 } });
    expect(requests).toHaveLength(0);
    expect(new HttpWhatsappClient(null).canUploadSamples()).toBe(false);
  });

  it('a Meta error on either step is a WaError with Meta’s code; an answer without a handle is too', async () => {
    const denied = { status: 400, body: { error: { message: '(#100) Invalid parameter', code: 100 } } };
    await expect(client(APP_ENV, denied).c.uploadSample(SAMPLE_REPORT)).rejects.toMatchObject({ info: { code: 100, status: 400 } });
    const second = client(APP_ENV, RECORDED_UPLOAD.session, denied);
    await expect(second.c.uploadSample(SAMPLE_REPORT)).rejects.toMatchObject({ info: { code: 100 } });
    const empty = client(APP_ENV, RECORDED_UPLOAD.session, { status: 200, body: {} });
    await expect(empty.c.uploadSample(SAMPLE_REPORT)).rejects.toBeInstanceOf(WaError);
    const odd = client(APP_ENV, { status: 200, body: { id: '../messages' } });
    await expect(odd.c.uploadSample(SAMPLE_REPORT)).rejects.toBeInstanceOf(WaError);
    expect(odd.requests).toHaveLength(1);
  });

  it('submitTemplate sends the DOCUMENT header with the handle first', async () => {
    const { c, requests } = client(APP_ENV, RECORDED_UPLOAD.createDoc);
    await expect(c.submitTemplate(REPORT_READY_SEED, { headerHandle: HANDLE })).resolves.toEqual({
      metaId: RECORDED_UPLOAD.createDoc.body.id,
      status: 'PENDING',
    });
    expect((requests[0]?.body as { components: unknown[] }).components[0]).toEqual({
      type: 'HEADER',
      format: 'DOCUMENT',
      example: { header_handle: [HANDLE] },
    });
  });
});
