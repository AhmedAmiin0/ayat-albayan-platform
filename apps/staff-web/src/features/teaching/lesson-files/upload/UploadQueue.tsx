import { t, cn } from '@ab/web-kit';
import type { QueueItem, QueueState } from './use-upload-queue';

const F = t.lessonFiles;

const WORD: Record<QueueState, string> = {
  queued: F.waiting,
  uploading: F.uploading,
  done: F.uploaded,
  type: F.badType,
  too_large: F.tooLarge,
  failed: F.uploadFailed,
};

const TONE: Record<QueueState, string> = {
  queued: 'text-ink-3',
  uploading: 'text-ink-3',
  done: 'text-ok',
  type: 'text-danger',
  too_large: 'text-danger',
  failed: 'text-danger',
};

export function UploadQueue({ items }: { items: readonly QueueItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul role="status" className="grid gap-1">
      {items.map((item) => (
        <li key={item.key} className="grid text-xs">
          <span className="truncate font-semibold">{item.name}</span>
          <span className={cn(TONE[item.state])}>{WORD[item.state]}</span>
        </li>
      ))}
    </ul>
  );
}
