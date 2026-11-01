import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { AttachIcon } from '../shared/chat-icons';
import { AttachSheet } from './attach/AttachSheet';
import { usePickSend } from './attach/use-pick-send';
import { useThreadMode } from '../thread/hooks/thread-mode';

interface AttachFileProps {
  phone: string;
  /** Why the file did not go (inbox.error.<code>), or null when a new pick starts. */
  onError: (message: string | null) => void;
  onTemplate: () => void;
  onReplies?: (() => void) | undefined;
  /** «الرموز التعبيرية»: the pill opens its emoji sheet (insert at the caret). */
  onEmoji: () => void;
}

/**
 * The pill's paperclip (owner 2026-10-19 #1/#2; 2026-10-27 as WhatsApp Business): its sheet sends a
 * photo (gallery or camera) or a PDF at once, and holds «قالب», «الردود السريعة» and the emoji
 * (owner 2026-10-27: only the price tag and the paperclip stay in the bar). Never in teacher mode
 * (teachers do not send files: the API answers 403 files_forbidden); the composer shows it only
 * while the 24 h window is open. Owner 2026-11-01: no camera in the bar; the sheet keeps its tile.
 */
export function AttachFile({ phone, onError, ...actions }: AttachFileProps) {
  const { color } = useTheme();
  const teacher = useThreadMode().kind === 'teacher';
  const { pick, pending } = usePickSend(phone, onError);
  const [choosing, setChoosing] = useState(false);
  if (teacher) return null;
  return (
    <>
      <IconButton label={t.inbox.composer.attach} disabled={pending} onPress={() => setChoosing(true)} compact>
        <AttachIcon color={color.lapis} />
      </IconButton>
      <AttachSheet
        visible={choosing}
        onPick={(source) => void pick(source)}
        onClose={() => setChoosing(false)}
        {...actions}
      />
    </>
  );
}
