import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '../../common/storage/storage.service';
import { InboundMedia } from '../whatsapp/messages/inbound-media.service';
import type { MediaMessage } from '../whatsapp/messages/inbound-media.queries';
import type { MessageRow } from '../whatsapp/messages/message.mapper';
import { messageRow } from '../whatsapp/sender/sender.fakes';
import { PHONE, threadRow } from './inbox.fakes';
import { ADMIN, inboxApp } from './test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const SRC = 'a0000000-0000-4000-8000-0000000000f2';
const REQ = 'c0000000-0000-4000-8000-000000000004';
const A = '+966500000001';
const B = '+966500000003';
const FRESH = new Date(Date.now() - 3_600_000).toISOString();
const COPY = `out/${ADMIN.id}/${REQ}/fwd-${SRC}`;
const forward = (token = 'admin') => ({ method: 'POST' as const, url: '/threads/forward', token, body: { messageId: SRC, targets: [A, B], clientRequestId: REQ } });

describe('POST /threads/forward with a file: re-sent from our storage, never uploaded again', () => {
  let t: App;
  let storage: StorageService;
  let inbound: InboundMedia;
  let src: MessageRow;
  beforeAll(async () => {
    t = await inboxApp();
    storage = t.app.get(StorageService);
    inbound = t.app.get(InboundMedia);
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
    vi.spyOn(storage, 'copy').mockResolvedValue();
    t.queries.thread.mockImplementation(async (phone: string) => threadRow({ phone_e164: phone, last_inbound_at: FRESH }));
    t.queries.get.mockImplementation(async (id: string) => (id === SRC ? src : null));
    t.queries.enqueue.mockImplementation(async (row: Partial<MessageRow>) =>
      messageRow({ ...row, id: `m-${row.phone_e164 ?? ''}`, template_key: null, template_params: null }));
    t.teacher.teacher.mockResolvedValue({ id: 'tch-1', display_name_ar: 'أبرار', phone_e164: null });
    t.teacher.phones.mockResolvedValue([PHONE, A, B]);
  });

  it('ours (out/…): one copy for the forward, each target queues that path with the caption and name', async () => {
    src = messageRow({ id: SRC, phone_e164: PHONE, template_key: null, body: 'الجدول', media_path: 'out/x/y/a.pdf', media_mime: 'application/pdf', media_name: 'الجدول.pdf' });
    const res = await t.call(forward());
    expect(res.json().results.map((r: { sent: boolean }) => r.sent)).toEqual([true, true]);
    expect(storage.copy).toHaveBeenCalledTimes(1);
    expect(storage.copy).toHaveBeenCalledWith({ from: { bucket: 'wa-media', path: 'out/x/y/a.pdf' }, to: { bucket: 'wa-media', path: `${COPY}.pdf` } });
    for (const phone of [A, B]) {
      expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({
        phone_e164: phone, media_path: `${COPY}.pdf`, media_mime: 'application/pdf', media_name: 'الجدول.pdf', body: 'الجدول', forwarded_from_id: SRC,
      }));
    }
  });

  it('theirs: a voice note is fetched into our cache first (as the bubble does), then copied', async () => {
    src = messageRow({ id: SRC, direction: 'inbound', phone_e164: PHONE, template_key: null, body: null, media_id: 'mid', media_mime: 'audio/ogg; codecs=opus' });
    const msg = { id: SRC, direction: 'inbound', media_mime: 'audio/ogg; codecs=opus' } as MediaMessage;
    vi.spyOn(inbound, 'load').mockResolvedValue(msg);
    const cache = vi.spyOn(inbound, 'cache').mockResolvedValue({ bucket: 'wa-media', path: `${SRC}.ogg`, mime: 'audio/ogg' });
    await t.call(forward());
    expect(cache).toHaveBeenCalledWith(msg);
    expect(storage.copy).toHaveBeenCalledWith({ from: { bucket: 'wa-media', path: `${SRC}.ogg` }, to: { bucket: 'wa-media', path: `${COPY}.ogg` } });
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({ media_path: `${COPY}.ogg`, media_mime: 'audio/ogg', body: null }));
  });

  it('a teacher never sends files: every target skipped as files_forbidden, nothing copied or queued', async () => {
    src = messageRow({ id: SRC, phone_e164: PHONE, template_key: null, body: null, media_path: 'out/x/y/a.png', media_mime: 'image/png' });
    const res = await t.call(forward('teacher'));
    expect(res.json().results).toEqual([
      { phone: A, sent: false, reason: 'files_forbidden' },
      { phone: B, sent: false, reason: 'files_forbidden' },
    ]);
    expect(storage.copy).not.toHaveBeenCalled();
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('an outbound file we never stored (imported history) is 400 not_forwardable', async () => {
    src = messageRow({ id: SRC, phone_e164: PHONE, template_key: null, body: null, media_path: null, media_mime: 'image/png' });
    const res = await t.call(forward());
    expect([res.statusCode, res.json().code]).toEqual([400, 'not_forwardable']);
  });
});
