import { describe, expect, it } from 'vitest';
import { chatFileRoutes, chatMediaRoutes } from '../chat-files.routes';

const ID = '00000000-0000-4000-8000-000000000001';
const PHONE = '+966500000001';
const SIGNED = { url: 'https://files.test/a.jpg?token=t', expires_at: '2026-11-27T12:00:00.000Z' };
const ITEM = {
  message_id: ID,
  created_at: '2026-11-20T09:30:00.000Z',
  mime: 'application/pdf',
  caption: 'تحويل بنكي',
  expired: false,
};

describe('chatFileRoutes', () => {
  it('keeps the paths of today', () => {
    const lines = Object.values(chatFileRoutes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /threads/:phone/messages/:messageId/file',
      'GET /threads/:phone/messages/:messageId/pdf/:page',
    ]);
  });

  it('reads any spelling of the phone and refuses a bad phone or a non-uuid id', () => {
    const params = chatFileRoutes.file.params;
    expect(params.parse({ phone: '966500000001', messageId: ID })).toEqual({ phone: PHONE, messageId: ID });
    expect(params.safeParse({ phone: 'abc', messageId: ID }).success).toBe(false);
    expect(params.safeParse({ phone: PHONE, messageId: 'm1' }).success).toBe(false);
  });

  it('takes ?download as given and answers the signed file with its type', () => {
    expect(chatFileRoutes.file.query.parse({ download: '1' })).toEqual({ download: '1' });
    expect(chatFileRoutes.file.query.parse({})).toEqual({});
    const file = { ...SIGNED, mime: 'image/jpeg' };
    expect(chatFileRoutes.file.response.parse(file)).toEqual(file);
    expect(chatFileRoutes.file.response.safeParse(SIGNED).success).toBe(false);
    expect(chatFileRoutes.file.response.safeParse({ ...file, url: 'x' }).success).toBe(false);
  });

  it('reads pages 1 to 30 only and answers the page with the count and size', () => {
    const params = chatFileRoutes.pdfPage.params;
    expect(params.parse({ phone: PHONE, messageId: ID, page: '3' }).page).toBe(3);
    for (const page of ['0', '31', '1.5', 'x']) {
      expect(params.safeParse({ phone: PHONE, messageId: ID, page }).success).toBe(false);
    }
    const page = { ...SIGNED, page: 1, pages: 4, bytes: 52_000 };
    expect(chatFileRoutes.pdfPage.response.parse(page)).toEqual(page);
    expect(chatFileRoutes.pdfPage.response.safeParse({ ...page, pages: 0 }).success).toBe(false);
  });

  it('lets inbox.read in and tags both inbox', () => {
    const access = Object.values(chatFileRoutes).map((r) => [r.permissions, r.tags]);
    expect(access).toEqual([
      [['inbox.read'], ['inbox']],
      [['inbox.read'], ['inbox']],
    ]);
  });
});

describe('chatMediaRoutes', () => {
  it('keeps the paths of today', () => {
    const lines = Object.values(chatMediaRoutes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual(['GET /threads/:phone/media', 'GET /threads/:phone/media/:messageId']);
  });

  it('answers the picker list, with a null caption allowed and the instant checked', () => {
    const list = chatMediaRoutes.list.response;
    expect(list.parse([ITEM, { ...ITEM, caption: null }])).toHaveLength(2);
    expect(list.safeParse([{ ...ITEM, created_at: 'yesterday' }]).success).toBe(false);
    expect(list.safeParse([{ ...ITEM, message_id: 'm1' }]).success).toBe(false);
    expect(chatMediaRoutes.list.params.safeParse({ phone: 'abc' }).success).toBe(false);
  });

  it('answers one listed file signed with its type', () => {
    const file = { ...SIGNED, mime: 'application/pdf' };
    expect(chatMediaRoutes.file.response.parse(file)).toEqual(file);
    expect(chatMediaRoutes.file.params.safeParse({ phone: PHONE, messageId: 'm' }).success).toBe(
      false,
    );
  });

  it('lets inbox.media in, never inbox.read alone, and tags both inbox', () => {
    const access = Object.values(chatMediaRoutes).map((r) => [r.permissions, r.tags]);
    expect(access).toEqual([
      [['inbox.media'], ['inbox']],
      [['inbox.media'], ['inbox']],
    ]);
  });
});
