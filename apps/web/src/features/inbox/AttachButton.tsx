import { CHAT_SEND_MIMES, chatFileProblem, type ChatFileProblem } from '@ab/shared';
import { useRef } from 'react';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { t } from '@/lib/i18n';
import { useUploadMaxBytes } from '@/lib/public-config';

export interface AttachButtonProps {
  /** A JPEG, PNG or PDF within the limits: FileComposer takes over the box. */
  onPick: (file: File) => void;
  /** Why the picked file cannot be sent (checked again by the API). */
  onProblem: (problem: ChatFileProblem) => void;
}

/**
 * The paperclip before the message box (D2): picks one image or PDF. The academy's upload limit
 * (settings.upload_max_mb) and Meta's 5 MB image cap are checked here, before any upload.
 * ComposerPhone shows it only inside the 24 h window, and never to a teacher.
 */
export function AttachButton({ onPick, onProblem }: AttachButtonProps) {
  const input = useRef<HTMLInputElement>(null);
  const maxBytes = useUploadMaxBytes();
  return (
    <>
      <IconButton label={t.inbox.composer.attach} className="rounded-full" onClick={() => input.current?.click()}>
        <Icon name="paperclip" className="size-5" />
      </IconButton>
      <input
        ref={input}
        type="file"
        hidden
        accept={CHAT_SEND_MIMES.join(',')}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // the same file again fires a change
          if (!file) return;
          const problem = chatFileProblem({ mime: file.type, size: file.size, maxBytes });
          if (problem) onProblem(problem);
          else onPick(file);
        }}
      />
    </>
  );
}
