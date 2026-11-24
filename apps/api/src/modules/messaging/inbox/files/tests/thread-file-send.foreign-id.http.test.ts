import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '@/common/storage/storage.service';
import {
  FOREIGN_PHONE,
  teachesOwnFamily,
  threadUrl,
} from '@/modules/messaging/inbox/foreign-id.fakes';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { inboxApp } from '@/modules/messaging/inbox/test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const REQ = 'c0000000-0000-4000-8000-000000000001';
const FRESH = new Date(Date.now() - 3_600_000).toISOString();
const FILE_URL = `${threadUrl(PHONE)}/file`;
const upload = { clientRequestId: REQ, mime: 'image/png', size: 2048 };
const sendOf = (path: string) => ({ clientRequestId: REQ, path, filename: 'f.png' });

describe('POST /threads/:phone/file-upload-url | file with another user\'s ids', () => {
  let t: App;
  let storage: StorageService;
  beforeAll(async () => {
    t = await inboxApp();
    storage = t.app.get(StorageService);
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    teachesOwnFamily(t);
    t.chatClient.configured.mockReturnValue(true);
    t.client.configured.mockReturnValue(true);
    vi.spyOn(storage, 'signedUpload').mockResolvedValue({
      ...{ bucket: 'wa-media', path: 'x', token: 't', signed_url: 'http://up' },
    });
    vi.spyOn(storage, 'info').mockResolvedValue({ size: 2048, contentType: 'image/png' });
    t.queries.thread.mockResolvedValue(
      threadRow({ last_inbound_at: FRESH, last_notifications_inbound_at: FRESH }),
    );
  });

  const nothingSignedOrQueued = () => {
    expect(storage.signedUpload).not.toHaveBeenCalled();
    expect(storage.info).not.toHaveBeenCalled();
    expect(t.queries.enqueue).not.toHaveBeenCalled();
    expect(t.audit.record).not.toHaveBeenCalled();
  };

  it('a teacher on another teacher\'s family is 403 on both routes', async () => {
    const url = threadUrl(FOREIGN_PHONE);
    const token = 'teacher';
    const up = await t.call({ method: 'POST', url: `${url}/file-upload-url`, token, body: upload });
    const body = sendOf(`out/t1/${REQ}/f.png`);
    const send = await t.call({ method: 'POST', url: `${url}/file`, token, body });
    expect([up.statusCode, send.statusCode]).toEqual([403, 403]);
    expect(t.queries.thread).not.toHaveBeenCalled();
    nothingSignedOrQueued();
  });

  it('a salesperson sending another staff member\'s upload is 400 file_path', async () => {
    const body = sendOf(`out/s2/${REQ}/f.png`);
    const res = await t.call({ method: 'POST', url: FILE_URL, token: 'sales', body });
    expect([res.statusCode, res.json().code]).toEqual([400, 'file_path']);
    nothingSignedOrQueued();
  });

  it('the admin sending a salesperson\'s upload is 400 file_path too', async () => {
    const body = sendOf(`out/s1/${REQ}/f.png`);
    const res = await t.call({ method: 'POST', url: FILE_URL, token: 'admin', body });
    expect([res.statusCode, res.json().code]).toEqual([400, 'file_path']);
    nothingSignedOrQueued();
  });
});
