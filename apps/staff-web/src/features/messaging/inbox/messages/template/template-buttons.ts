import type { TemplateButtonKind } from '@ab/shared';
import type { IconName } from '@/components/ui/display/icon';

/** A template button's leading icon by type, as WhatsApp draws them (owner 2026-10-28). */
export const BUTTON_ICON: Record<TemplateButtonKind, IconName> = {
  quick_reply: 'reply',
  url: 'external',
  phone_number: 'call',
  copy_code: 'copy',
};
