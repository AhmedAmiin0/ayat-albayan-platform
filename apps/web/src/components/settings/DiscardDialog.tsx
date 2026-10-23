import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

export interface DiscardWords {
  title: string;
  body: string;
  /** The danger action («أغلق دون حفظ», «تجاهل التغييرات»). */
  discard: string;
  /** The safe default, focused first («تابع التعديل»). */
  keep: string;
}

export interface DiscardDialogProps {
  words: DiscardWords;
  onDiscard: () => void;
  onKeep: () => void;
}

/**
 * Closing a phone sheet with an unsaved edit asks first (docs/26b §2 «Phone»): «تابع التعديل»
 * (focused, also Esc) or the discard. Shared by «القيم» and «الإشعارات».
 */
export function DiscardDialog({ words, onDiscard, onKeep }: DiscardDialogProps) {
  return (
    <Dialog
      compact
      title={words.title}
      description={words.body}
      onClose={onKeep}
      actions={
        <>
          <Button variant="secondary" data-autofocus onClick={onKeep}>
            {words.keep}
          </Button>
          <Button variant="danger-quiet" onClick={onDiscard}>
            {words.discard}
          </Button>
        </>
      }
    >
      {null}
    </Dialog>
  );
}
