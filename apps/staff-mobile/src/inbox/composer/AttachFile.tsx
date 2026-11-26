import { useState } from 'react';
import { t, useTheme, IconButton, AttachIcon } from '@ab/mobile-kit';
import { AttachSheet } from './attach/AttachSheet';
import { usePickSend } from './attach/use-pick-send';
import { useThreadMode } from '@/inbox/thread/hooks/thread-mode';

interface AttachFileProps {
  phone: string;
  /** Why the file did not go (inbox.error.<code>), or null when a new pick starts. */
  onError: (message: string | null) => void;
  onTemplate: () => void;
  onReplies?: (() => void) | undefined;
  /** Inserts the emoji at the caret. */
  onEmoji: () => void;
}

/** Never in teacher mode (API answers 403 files_forbidden); only while the 24 h window is open. */
export function AttachFile({ phone, onError, ...actions }: AttachFileProps) {
  const { color } = useTheme();
  const teacher = useThreadMode().kind === 'teacher';
  const { pick, pending } = usePickSend(phone, onError);
  const [choosing, setChoosing] = useState(false);
  if (teacher) return null;
  return (
    <>
      <IconButton
        label={t.inbox.composer.attach}
        disabled={pending}
        onPress={() => setChoosing(true)}
        compact
      >
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
