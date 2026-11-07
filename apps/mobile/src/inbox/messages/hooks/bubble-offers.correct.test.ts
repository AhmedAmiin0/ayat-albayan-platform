import type { MessageView } from '@ab/shared';
import { inbound, message } from '@/inbox/shared/thread-fixtures';
import { bubbleOffers } from './bubble-offers';

type Options = Parameters<typeof bubbleOffers>[1];

// «تعديل» (owner 2026-11-07): a correction of our own sent text; the admin's on anyone's.
const sales = { id: 'u1', role: 'sales' };
const admin = { id: 'u9', role: 'admin' };
const on: Options = { enabled: true, teacher: false, me: sales };
const own = message({
  id: 'o1',
  direction: 'outbound',
  status: 'delivered',
  body: 'الحلقة غدًا الساعة 5',
  replyable: true,
  sent_by_id: 'u1',
});
const offers = (m: MessageView, opts = on) => bubbleOffers(m, opts);

test('our own sent text offers «تعديل», and no «لا يمكن تعديل…» note', () => {
  expect(offers(own)).toMatchObject({ correct: true, noEdit: false });
});

test("a colleague's text: only the admin may correct it; the others get the note", () => {
  const theirs = { ...own, sent_by_id: 'u2' };
  expect(offers(theirs)).toMatchObject({ correct: false, noEdit: true });
  expect(offers(theirs, { ...on, me: admin })).toMatchObject({ correct: true, noEdit: false });
});

test('never a template, a file, a failed, hidden or deleted message, nor theirs', () => {
  const template = { ...own, template_key: 'welcome' };
  expect(offers(template)).toMatchObject({ correct: false, noEdit: false });
  expect(offers({ ...own, media_mime: 'image/jpeg' })).toMatchObject({ correct: false, noEdit: true });
  expect(offers({ ...own, status: 'failed' })).toMatchObject({ correct: false, noEdit: true });
  expect(offers({ ...own, deleted: true })).toMatchObject({ correct: false, noEdit: false });
  const hidden = { ...own, hidden: { by_name: 'سارة', at: '2026-11-07T10:00:00.000Z' } };
  expect(offers(hidden).correct).toBe(false);
  expect(offers({ ...inbound, replyable: true }, { ...on, me: admin }).correct).toBe(false);
});

test('off outside a staff chat (a teacher) and before /auth/me answers', () => {
  expect(offers(own, { enabled: false, teacher: true, me: sales }).correct).toBe(false);
  expect(offers(own, { ...on, me: null })).toMatchObject({ correct: false, noEdit: true });
});

test('never a correction: staff correct the original again (review of #694, round 3)', () => {
  const fix = { ...own, id: 'c1', body: 'تصحيح: الحلقة الساعة 6', corrects_id: 'o1' };
  expect(offers(fix).correct).toBe(false);
  expect(offers(fix, { ...on, me: admin }).correct).toBe(false);
});
