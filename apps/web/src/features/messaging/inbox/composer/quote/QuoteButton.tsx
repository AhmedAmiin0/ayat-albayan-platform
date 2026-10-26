import type { ThreadView } from '@ab/shared';
import { useState } from 'react';
import { Icon } from '@/components/ui/display/icon';
import { IconButton } from '@/components/ui/form/icon-button';
import { t } from '@/lib/i18n/i18n';
import { QuoteDialog } from './QuoteDialog';

export interface QuoteButtonProps {
  thread: ThreadView;
  /** «عدّل قبل الإرسال» filled the box (the composer leaves template mode). */
  onFilled: () => void;
}

/** «عرض سعر» beside the composer's quick buttons (admin and sales with pricing.read; never a teacher). */
export function QuoteButton({ thread, onFilled }: QuoteButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton label={t.inbox.quote.open} title={t.inbox.quote.open} className="rounded-full" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <Icon name="receipt" className="size-5" />
      </IconButton>
      {open && <QuoteDialog thread={thread} onClose={() => setOpen(false)} onFilled={onFilled} />}
    </>
  );
}
