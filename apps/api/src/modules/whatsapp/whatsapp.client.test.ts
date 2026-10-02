import { describe, expect, it } from 'vitest';
import { HttpWhatsappClient } from './whatsapp.client';
import { RECORDED, scriptedFetch, STUB_ENV, templateRow } from './whatsapp.fakes';
import { WaError } from './whatsapp.types';

const params = { '1': 'سلمى', '2': 'الأحد 4 أكتوبر 17:00', button: 'ab-sara-x1' };
const send = (c: HttpWhatsappClient) => c.sendTemplate({ to: '+966551234567', template: templateRow(), params });

function client(...replies: Parameters<typeof scriptedFetch>) {
  const f = scriptedFetch(...replies);
  return { c: new HttpWhatsappClient(STUB_ENV, { fetch: f.fetch, timeoutMs: 1_000 }), requests: f.requests };
}

describe('HttpWhatsappClient against recorded wa-stub answers (no network)', () => {
  it('posts to {base}/{version}/{phone}/messages with the bearer and returns the wamid', async () => {
    const { c, requests } = client(RECORDED.sendOk);
    await expect(send(c)).resolves.toEqual({ waMessageId: 'wamid.d75640b5-fa48-4b20-bf51-8b9093173f42' });
    const [req] = requests;
    expect(req?.url).toBe('http://127.0.0.1:4010/v21.0/stub-phone/messages');
    expect(req?.init.method).toBe('POST');
    expect(req?.init.headers).toMatchObject({ authorization: 'Bearer test-token', 'content-type': 'application/json' });
    expect(req?.body).toMatchObject({ to: '966551234567', type: 'template' });
  });

  it.each([
    { name: 'template missing', reply: RECORDED.templateMissing, info: { code: 132001, status: 404, details: 'template name (report_ready) does not exist in ar' } },
    { name: 'window closed', reply: RECORDED.windowClosed, info: { code: 131047, status: 400, details: 'More than 24 hours have passed since the recipient last replied' } },
    { name: 'bad token', reply: RECORDED.badToken, info: { code: 190, status: 401, details: undefined } },
  ])('$name → WaError with Meta code, HTTP status and details', async ({ reply, info }) => {
    const { c } = client(reply);
    const err = await send(c).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WaError);
    expect((err as WaError).info).toEqual(info);
  });

  it('a 5xx without a Meta body, a network error or a timeout → code null (retryable)', async () => {
    const html = { status: 502, body: '<html>bad gateway</html>' };
    expect(await send(client(html).c).catch((e: WaError) => e.info)).toMatchObject({ code: null, status: 502 });
    const down = send(client(new TypeError('fetch failed')).c);
    await expect(down).rejects.toMatchObject({ info: { code: null, status: 0 }, message: expect.stringContaining('fetch failed') });
    const slow = new HttpWhatsappClient(STUB_ENV, {
      timeoutMs: 5,
      fetch: (_u, init) => new Promise((_r, reject) => init.signal?.addEventListener('abort', () => reject(init.signal?.reason))),
    });
    expect(await send(slow).catch((e: WaError) => e.info)).toEqual({ code: null, status: 0 });
  });

  it('not configured: every call throws code null / status 0 and nothing is requested', async () => {
    const f = scriptedFetch();
    const c = new HttpWhatsappClient(null, { fetch: f.fetch });
    expect(c.configured()).toBe(false);
    await expect(send(c)).rejects.toMatchObject({ info: { code: null, status: 0 } });
    await expect(c.getTemplates()).rejects.toBeInstanceOf(WaError);
    await expect(c.markRead('wamid.x')).rejects.toBeInstanceOf(WaError);
    expect(f.requests).toHaveLength(0);
  });

  it('getTemplates maps Meta fields and stops on cursors without a next page (the stub always sends cursors)', async () => {
    const { c, requests } = client(RECORDED.templates);
    const list = await c.getTemplates();
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toMatch(/^http:\/\/127\.0\.0\.1:4010\/v21\.0\/stub-waba\/message_templates\?limit=100&fields=/);
    expect(list.map((t) => [t.name, t.status, t.quality, t.rejectedReason])).toEqual([
      ['booking_confirmation', 'APPROVED', 'GREEN', null],
      ['teacher_lesson_reminder', 'APPROVED', 'GREEN', null],
    ]);
  });

  it('getTemplates follows the after-cursor on our base while Meta says next, never Meta’s own URL', async () => {
    const page1 = {
      status: 200,
      body: { data: [{ id: '1', name: 'a', language: 'ar', status: 'REJECTED', rejected_reason: 'INVALID_FORMAT', components: [] }], paging: { next: 'https://graph.facebook.com/v21.0/x?after=c1', cursors: { after: 'c1' } } },
    };
    const page2 = { status: 200, body: { data: [{ id: '2', name: 'b', language: 'ar', status: 'PENDING', rejected_reason: 'NONE' }] } };
    const { c, requests } = client(page1, page2);
    const list = await c.getTemplates();
    expect(requests[1]?.url).toMatch(/^http:\/\/127\.0\.0\.1:4010\/v21\.0\/stub-waba\/message_templates\?.*&after=c1$/);
    expect(list.map((t) => [t.name, t.rejectedReason, t.quality])).toEqual([['a', 'INVALID_FORMAT', null], ['b', null, null]]);
  });

  it('submitTemplate creates a new template, and edits a rejected one Meta already has', async () => {
    const created = client(RECORDED.createTemplate);
    await expect(created.c.submitTemplate(templateRow({ status: 'not_submitted' }))).resolves.toEqual({
      metaId: '964b3b49-13f6-4408-b518-23536278ea71',
      status: 'PENDING',
    });
    expect(created.requests[0]?.url).toBe('http://127.0.0.1:4010/v21.0/stub-waba/message_templates');
    expect(created.requests[0]?.body).toMatchObject({ name: 'booking_confirmation', category: 'UTILITY' });
    const edited = client({ status: 200, body: { success: true } });
    const rejected = templateRow({ status: 'rejected', meta_id: 'meta-7' });
    await expect(edited.c.submitTemplate(rejected)).resolves.toEqual({ metaId: 'meta-7', status: 'PENDING' });
    expect(edited.requests[0]?.url).toBe('http://127.0.0.1:4010/v21.0/meta-7');
    expect(Object.keys(edited.requests[0]?.body as object)).toEqual(['category', 'components']);
  });

  it('markRead posts the read receipt; getMedia reads the metadata then the bytes with the bearer', async () => {
    const { c, requests } = client(RECORDED.read);
    await c.markRead('wamid.in1');
    expect(requests[0]?.body).toEqual({ messaging_product: 'whatsapp', status: 'read', message_id: 'wamid.in1' });
    const media = client(
      { status: 200, body: { url: 'http://127.0.0.1:4010/__stub/media/m1', mime_type: 'audio/ogg', id: 'm1' } },
      { status: 200, body: 'OggS' },
    );
    const got = await media.c.getMedia('m1');
    expect(got.mime).toBe('audio/ogg');
    expect(new TextDecoder().decode(got.bytes)).toBe('"OggS"');
    expect(media.requests.map((r) => r.url)).toEqual(['http://127.0.0.1:4010/v21.0/m1', 'http://127.0.0.1:4010/__stub/media/m1']);
    expect(media.requests[1]?.init.headers).toMatchObject({ authorization: 'Bearer test-token' });
  });

  it('a 200 without a message id is an error, never a silent success', async () => {
    const { c } = client({ status: 200, body: { messages: [] } });
    await expect(send(c)).rejects.toBeInstanceOf(WaError);
  });
});
