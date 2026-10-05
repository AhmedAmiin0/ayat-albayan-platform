import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

export interface ThreadSideSheetProps {
  /** The button's text and the sheet's title: «بيانات العميل والتسجيل» / «الأبناء والاشتراكات». */
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The panel that sits beside the chat on wide screens (LeadPanel / SubscribePanel). */
  children: ReactNode;
}

/**
 * Phones (< 640px, owner 2026-10-05): the thread's side panel is not stacked under the chat; a
 * button in the thread header opens it as a full-screen Dialog, so the chat keeps its place.
 */
export function ThreadSideSheet({ label, open, onOpenChange, children }: ThreadSideSheetProps) {
  return (
    <>
      <Button type="button" variant="secondary" aria-haspopup="dialog" className="w-full" onClick={() => onOpenChange(true)}>
        {label}
      </Button>
      {open && (
        <Dialog title={label} onClose={() => onOpenChange(false)}>
          {children}
        </Dialog>
      )}
    </>
  );
}
