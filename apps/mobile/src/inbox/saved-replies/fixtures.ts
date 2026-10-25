import type { SavedReply } from '@ab/shared';

// GET /saved-replies rows for the picker and the settings screen tests.

const at = '2026-10-25T00:00:00Z';

export const PRICES: SavedReply = {
  id: '5a000000-0000-4000-8000-000000000001',
  scope: 'shared',
  title: 'الأسعار',
  body: 'أهلًا {name}، معك {assistant}. تجد الأسعار مرفقة لـ{student}.',
  attachment: { name: 'الأسعار.pdf', mime: 'application/pdf', size: 2048 },
  position: 0,
  updated_at: at,
};

export const WELCOME: SavedReply = {
  id: '5a000000-0000-4000-8000-000000000002',
  scope: 'shared',
  title: 'ترحيب',
  body: 'السلام عليكم، كيف نخدمك؟',
  attachment: null,
  position: 1,
  updated_at: at,
};

export const MINE: SavedReply = {
  id: '5a000000-0000-4000-8000-000000000003',
  scope: 'mine',
  title: 'متابعة',
  body: 'هل اطلعت على الجدول؟',
  attachment: null,
  position: 0,
  updated_at: at,
};

export const REPLIES = [PRICES, WELCOME, MINE];
