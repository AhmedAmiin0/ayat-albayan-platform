import { describe, expect, it } from 'vitest';
import { salesChatReceiptRoutes as routes } from '../chat-receipts.routes';

const STUDENT = '11111111-1111-4111-8111-111111111111';
const MESSAGE = '22222222-2222-4222-8222-222222222222';
const RECEIPT = {
  message_id: MESSAGE,
  created_at: '2026-11-27T10:00:00Z',
  mime: 'image/jpeg',
  caption: null,
  expired: false,
};
const FILE = {
  url: 'https://storage.test/x.jpg',
  expires_at: '2026-11-27T11:00:00Z',
  mime: 'image/jpeg',
};

describe('salesChatReceiptRoutes', () => {
  it('keeps the paths, the permission and the tag the api serves today', () => {
    const wire = Object.values(routes).map((r) => [r.method, r.path, r.permissions, r.tags]);
    expect(wire).toEqual([
      ['GET', '/sales/money/chat-receipts', ['self.sales_money'], ['sales']],
      ['GET', '/sales/money/chat-receipts/:messageId', ['self.sales_money'], ['sales']],
    ]);
  });

  it('takes the student and, for a child not hers, the chat phone', () => {
    const query = routes.list.query;
    expect(query.parse({ studentId: STUDENT })).toEqual({ studentId: STUDENT });
    expect(query.parse({ studentId: STUDENT, phone: '+966500000001' }).phone).toBe('+966500000001');
    expect(query.safeParse({}).success).toBe(false);
    expect(query.safeParse({ studentId: 'nope' }).success).toBe(false);
    expect(routes.file.params.safeParse({ messageId: 'nope' }).success).toBe(false);
  });

  it('answers the receipt list and refuses a row without its time or type', () => {
    expect(routes.list.response.parse([RECEIPT])).toEqual([RECEIPT]);
    expect(routes.list.response.safeParse([{ ...RECEIPT, created_at: null }]).success).toBe(false);
    expect(routes.list.response.safeParse([{ ...RECEIPT, mime: '' }]).success).toBe(false);
  });

  it('answers one file signed, with the type it is served as', () => {
    expect(routes.file.response.parse(FILE)).toEqual(FILE);
    expect(routes.file.response.safeParse({ ...FILE, mime: undefined }).success).toBe(false);
  });
});
