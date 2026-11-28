import type { ReactNode } from 'react';
import { Button, Dialog, Icon, IconButton } from '@ab/web-kit';
import { SideSheetCloseContext } from '@/features/messaging/inbox/shared/side-sheet';

export interface ThreadSideSheetProps {
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The panel that sits beside a 48rem thread (LeadPanel / SubscribePanel). */
  children: ReactNode;
  /** The compact chat header: an icon button named by `label` instead of a full-width one. */
  compact?: boolean;
}

/**
 * While the thread is under 48rem (phones and most laptop windows) the side panel is not stacked
 * under the chat; a button in the thread header opens it as a Dialog, so the log stays the only
 * scroller and the chat keeps its place (docs/66 §2).
 */
export function ThreadSideSheet({
  label,
  open,
  onOpenChange,
  children,
  compact,
}: ThreadSideSheetProps) {
  return (
    <>
      {compact ? (
        <IconButton label={label} aria-haspopup="dialog" className="text-lapis" onClick={() => onOpenChange(true)}>
          <Icon name="person" className="size-5" />
        </IconButton>
      ) : (
        <Button type="button" variant="secondary" aria-haspopup="dialog" className="w-full" onClick={() => onOpenChange(true)}>
          {label}
        </Button>
      )}
      {open && (
        <Dialog title={label} onClose={() => onOpenChange(false)}>
          <SideSheetCloseContext value={() => onOpenChange(false)}>
            {children}
          </SideSheetCloseContext>
        </Dialog>
      )}
    </>
  );
}
