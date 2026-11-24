import { canOpen } from '@/core/auth/route-permissions';
import { t, type TabItem } from '@ab/mobile-kit';
import type { Can } from '@ab/mobile-kit';

/**
 * The classroom assistant's bottom tabs (web /assistant/): the lessons tab (self.assistant: the
 * lessons they assist, internal meetings below) and More (appearance, language, sign-out).
 */
export const assistantTabItems = (can: Can): TabItem[] => [
  { name: 'lessons', title: t.mobileRoles.lessonsTab, icon: 'today', hidden: !canOpen(can, 'assistantLessons') },
  { name: 'more', title: t.mobile.more, icon: 'more' },
];
