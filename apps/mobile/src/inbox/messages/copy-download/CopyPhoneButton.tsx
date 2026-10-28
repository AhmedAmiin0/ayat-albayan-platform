import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { copyText } from './chat-tools';
import { useBubbleChatActions } from '../../thread/hooks/chat-actions';
import { CopyIcon } from '../../shared/chat-icons';

/** «نسخ الرقم» in the chat header (owner 2026-10-26): the number in E.164 on the copy sheet. */
export function CopyPhoneButton({ phone }: { phone: string }) {
  const { color } = useTheme();
  const { showCopy } = useBubbleChatActions();
  return (
    <IconButton label={t.inbox.copy.phone} onPress={() => copyText({ title: t.inbox.copy.phoneTitle, text: phone }, showCopy)}>
      <CopyIcon color={color.lapis} />
    </IconButton>
  );
}
