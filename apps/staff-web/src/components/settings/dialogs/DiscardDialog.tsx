import { Button } from '@ab/web-kit/components/ui/form/button';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';

export interface DiscardWords {
  title: string;
  body: string;
  discard: string;
  /** The safe default, focused first. */
  keep: string;
}

export interface DiscardDialogProps {
  words: DiscardWords;
  onDiscard: () => void;
  onKeep: () => void;
}

/** Closing a phone sheet with an unsaved edit asks first (docs/26b §2); keep is focused and Esc. */
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
