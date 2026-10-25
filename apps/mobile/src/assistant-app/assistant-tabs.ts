import { canOpen } from '@/auth/route-permissions';
import type { Can } from '@/auth/use-permissions';
import { t } from '@/lib/i18n';
import type { TabItem } from '@/core/ui/layout/AppNativeTabs';

/**
 * The classroom assistant's bottom tabs (web /assistant/): «حلقاتي» (self.assistant: the lessons
 * they assist, internal meetings below) and «المزيد» (appearance, language, sign-out).
 */
export const assistantTabItems = (can: Can): TabItem[] => [
  { name: 'lessons', title: t.mobileRoles.lessonsTab, icon: 'today', hidden: !canOpen(can, 'assistantLessons') },
  { name: 'more', title: t.mobile.more, icon: 'more' },
];
