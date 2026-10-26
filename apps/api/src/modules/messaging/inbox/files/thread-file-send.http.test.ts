import { SETTING_DEFAULTS } from '@ab/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '../../../../common/storage/storage.service';
import { messageRow } from '../../whatsapp/sender/sender.fakes';
import { PHONE, threadRow } from '../inbox.fakes';
import { InboxSettings } from '../inbox.settings';
import { SALES, TEACHER, inboxApp } from '../test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const URL = `/threads/${encodeURIComponent(PHONE)}`;
const REQ = 'c0000000-0000-4000-8000-000000000001';
const PATH = `out/${SALES.id}/${REQ}/f.png`;
const FRESH = new Date(Date.now() - 3_600_000).toISOString();
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const sendBody = (over: object = {}) => ({ clientRequestId: REQ, path: PATH, filename: 'الواجب.png', caption: 'راجعي', ...over });

describe('POST /threads/:phone/file-upload-url and /file (owner 2026-10-19 #2)', () => {
  let t: App;
  let storage: StorageService;
  let settings: InboxSettings;
  beforeAll(async () => {
    t = await inboxApp();
    storage = t.app.get(StorageService);
    settings = t.app.get(InboxSettings);
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(settings, 'read').mockResolvedValue({ upload_max_mb: SETTING_DEFAULTS.upload_max_mb });
    vi.spyOn(storage, 'info').mockResolvedValue({ size: 2048, contentType: 'image/png' });
    vi.spyOn(storage, 'head').mockResolvedValue(PNG);
    vi.spyOn(storage, 'signedUpload').mockResolvedValue({ bucket: 'wa-media', path: PATH, token: 't', signed_url: 'http://up' });
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: FRESH, last_notifications_inbound_at: FRESH }));
    t.queries.enqueue.mockImplementation(async (row: object) => messageRow({ ...row, id: 'm9', template_key: null, template_params: null }));
    t.queries.get.mockResolvedValue(null);
    t.teacher.teacher.mockImplementation(async (id: string) => (id === TEACHER.id ? { id: 'tch-1', display_name_ar: 'أبرار', phone_e164: null } : null));
    t.teacher.phones.mockResolvedValue([PHONE]);
  });

  it('sales: 201, the row under her actor id, audited as thread_file', async () => {
    const res = await t.call({ method: 'POST', url: `${URL}/file`, token: 'sales', body: sendBody() });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ id: 'm9', media_mime: 'image/png', body: 'راجعي' });
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      created_by: SALES.id, media_path: PATH, media_name: 'الواجب.png', dedup_key: `sales:${SALES.id}:${PHONE}:${REQ}`,
    }));
    expect(t.audit.record).toHaveBeenCalledWith({
      actorId: SALES.id,
      entity: 'messages',
      entityId: 'm9',
      action: 'thread_file',
      before: null,
      after: { phone: PHONE, media_mime: 'image/png', media_name: 'الواجب.png', status: 'queued', sales_id: SALES.id },
    });
  });

  it('a replay is not audited again', async () => {
    t.queries.enqueue.mockResolvedValue({ ...messageRow({ id: 'm9', status: 'sent', template_key: null }), replayed: true });
    expect((await t.call({ method: 'POST', url: `${URL}/file`, token: 'sales', body: sendBody() })).statusCode).toBe(201);
    expect(t.audit.record).not.toHaveBeenCalled();
  });

  it('sales gets a signed upload URL for her own out/ path', async () => {
    const res = await t.call({ method: 'POST', url: `${URL}/file-upload-url`, token: 'sales', body: { clientRequestId: REQ, mime: 'image/png', size: 2048 } });
    expect([res.statusCode, res.json().signed_url]).toEqual([201, 'http://up']);
    expect(storage.signedUpload).toHaveBeenCalledWith({ bucket: 'wa-media', path: expect.stringMatching(`^out/${SALES.id}/${REQ}/`) });
  });

  it('a teacher: 403 files_forbidden on both routes, nothing signed or queued', async () => {
    const up = await t.call({ method: 'POST', url: `${URL}/file-upload-url`, token: 'teacher', body: { clientRequestId: REQ, mime: 'image/png', size: 1 } });
    const send = await t.call({ method: 'POST', url: `${URL}/file`, token: 'teacher', body: sendBody() });
    expect([up.statusCode, up.json().code, send.statusCode, send.json().code]).toEqual([403, 'files_forbidden', 403, 'files_forbidden']);
    expect(storage.signedUpload).not.toHaveBeenCalled();
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('a missing clientRequestId: 400, nothing queued', async () => {
    const res = await t.call({ method: 'POST', url: `${URL}/file`, token: 'sales', body: sendBody({ clientRequestId: undefined }) });
    expect(res.statusCode).toBe(400);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('another role (a guardian) is stopped by the guard', async () => {
    expect((await t.call({ method: 'POST', url: `${URL}/file`, token: 'guardian', body: sendBody() })).statusCode).toBe(403);
  });
});
