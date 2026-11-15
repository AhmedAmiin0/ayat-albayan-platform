import { delivered, inbound, message } from '@/inbox/shared/thread-fixtures';
import { bubbleOffers, offersAny } from './bubble-offers';

// «حذف من المنصة» (owner 2026-10-30): staff who may hide, the admin shows again; no WhatsApp edit.
const on = { enabled: true, teacher: false };
const hidden = { ...inbound, hidden: { by_name: 'سارة', at: '2026-10-30T10:00:00.000Z' } };

test('hide only for a user who may (admin, sales); never on a deleted message', () => {
  expect(bubbleOffers(inbound, { ...on, hide: true }).hide).toBe(true);
  expect(bubbleOffers(inbound, on).hide).toBe(false);
  expect(bubbleOffers({ ...inbound, deleted: true }, { ...on, hide: true }).hide).toBe(false);
  expect(bubbleOffers(inbound, { enabled: false, teacher: false, hide: true }).hide).toBe(false);
});

test('a hidden message offers only «إظهار», to the admin', () => {
  const admin = bubbleOffers(hidden, { ...on, hide: true, unhide: true });
  expect(admin).toMatchObject({
    unhide: true,
    hide: false,
    reply: false,
    copy: false,
    forward: false,
  });
  expect(offersAny(bubbleOffers(hidden, { ...on, hide: true }))).toBe(false);
});

test('«لا يمكن تعديل…» on our own text only, never a template or theirs', () => {
  expect(bubbleOffers(delivered, on).noEdit).toBe(true);
  expect(bubbleOffers(inbound, on).noEdit).toBe(false);
  const template = message({ id: 't1', direction: 'outbound', template_key: 'welcome' });
  expect(bubbleOffers(template, on).noEdit).toBe(false);
});
