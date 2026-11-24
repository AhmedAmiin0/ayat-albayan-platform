import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '@/common/storage/storage.service';
import {
  InboundMediaRepo,
  type MediaMessage,
} from '@/modules/messaging/whatsapp/messages/inbound-media/inbound-media.repo';
import {
  FOREIGN_MESSAGE,
  FOREIGN_PHONE,
  teachesOwnFamily,
  threadUrl,
} from '@/modules/messaging/inbox/foreign-id.fakes';
import { PHONE } from '@/modules/messaging/inbox/inbox.fakes';
import { inboxApp } from '@/modules/messaging/inbox/test-app';
import { PdfPreviewRepo } from './pdf/pdf-preview.repo';

type App = Awaited<ReturnType<typeof inboxApp>>;
const ROUTES = ['file', 'pdf/1'];
const urlOf = (phone: string, route: string) =>
  `${threadUrl(phone)}/messages/${FOREIGN_MESSAGE}/${route}`;
const foreignRow = (): MediaMessage => ({
  id: FOREIGN_MESSAGE,
  phone_e164: FOREIGN_PHONE,
  direction: 'outbound',
  media_id: null,
  media_mime: 'application/pdf',
  media_path: 'out/x/y/f.pdf',
  body: null,
  created_at: new Date().toISOString(),
  line: null,
});

describe('GET /threads/:phone/messages/:id/file | pdf/:page with another chat\'s ids', () => {
  let t: App;
  let media: InboundMediaRepo;
  let storage: StorageService;
  let pdfs: PdfPreviewRepo;
  beforeAll(async () => {
    t = await inboxApp();
    media = t.app.get(InboundMediaRepo);
    storage = t.app.get(StorageService);
    pdfs = t.app.get(PdfPreviewRepo);
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    teachesOwnFamily(t);
    vi.spyOn(media, 'message').mockResolvedValue(foreignRow());
    vi.spyOn(storage, 'signedDownload').mockResolvedValue({ url: 'http://x', expires_at: 'x' });
    vi.spyOn(pdfs, 'doc').mockResolvedValue(null);
  });

  const nothingRead = () => {
    expect(storage.signedDownload).not.toHaveBeenCalled();
    expect(pdfs.doc).not.toHaveBeenCalled();
  };

  it('a teacher on another teacher\'s family is 403 and the message is never read', async () => {
    for (const route of ROUTES) {
      const url = urlOf(FOREIGN_PHONE, route);
      const res = await t.call({ method: 'GET', url, token: 'teacher' });
      expect([res.statusCode, res.json().code]).toEqual([403, 'media_forbidden']);
    }
    expect(media.message).not.toHaveBeenCalled();
    nothingRead();
  });

  it('a salesperson asking for another chat\'s message under this phone is 404', async () => {
    for (const route of ROUTES) {
      const res = await t.call({ method: 'GET', url: urlOf(PHONE, route), token: 'sales' });
      expect([res.statusCode, res.json().code]).toEqual([404, 'message_not_found']);
    }
    nothingRead();
  });

  it('the admin is held to the same chat: another chat\'s message is 404 too', async () => {
    const res = await t.call({ method: 'GET', url: urlOf(PHONE, 'file'), token: 'admin' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'message_not_found']);
    nothingRead();
  });
});
