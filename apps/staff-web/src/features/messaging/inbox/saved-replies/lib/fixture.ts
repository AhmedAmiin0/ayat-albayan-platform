import type { SavedReply } from '@ab/shared';

// Shared by the saved-replies tests (not app code).

export function savedReply(patch: Partial<SavedReply> = {}): SavedReply {
  return {
    id: 'r-1',
    scope: 'shared',
    title: 'الترحيب',
    body: 'السلام عليكم {name}، معك {assistant}.',
    attachment: null,
    position: 0,
    updated_at: '2026-10-25T00:00:00Z',
    ...patch,
  };
}

export const PRICES = savedReply({
  id: 'r-2',
  title: 'الأسعار',
  body: 'تجد قائمة أسعار {student} مرفقة.',
  attachment: { name: 'الأسعار.pdf', mime: 'application/pdf', size: 2048 },
  position: 1,
});

export const MINE = savedReply({ id: 'r-3', scope: 'mine', title: 'متابعة', body: 'هل وصلتكم الرسالة؟' });

export const REPLIES: SavedReply[] = [savedReply(), PRICES, MINE];

export const PROFILE = { id: 'u1', full_name: 'سارة', email: null, phone_e164: null, avatar_url: null, role: 'sales' };
