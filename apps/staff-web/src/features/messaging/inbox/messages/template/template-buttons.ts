import type { TemplateButtonKind } from '@ab/shared';
import type { IconName } from '@ab/web-kit/components/ui/display/icon';

/** A template button's leading icon by type, as WhatsApp draws them. */
export const BUTTON_ICON: Record<TemplateButtonKind, IconName> = {
  quick_reply: 'reply',
  url: 'external',
  phone_number: 'call',
  copy_code: 'copy',
};
