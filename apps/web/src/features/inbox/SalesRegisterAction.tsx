import type { ThreadView } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { BookingWizard } from '@/features/booking/BookingWizard';
import { BookingModeContext, ChatReturnContext } from '@/features/booking/mode';
import { t } from '@/lib/i18n';
import { useInboxMode } from './mode';
import { canRegisterFrom, draftFromThread } from './sales-register';

const noop = () => undefined;

/**
 * «تسجيل طالب جديد» in a sales chat (R-ASST-01, docs/16): the booking wizard in sales mode, in a dialog
 * over the conversation. Guardian + student + teacher + trial time, through /sales/booking, so the
 * student is credited to the salesperson (brought_by). No price, no invoice, no package. Closing it, or
 * «ارجع للمحادثة» after booking, stays in the same chat, refreshed (the number is a family now).
 */
export function SalesRegisterAction({ thread }: { thread: ThreadView }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  if (useInboxMode() !== 'sales' || !canRegisterFrom(thread)) return null;
  const close = () => {
    setOpen(false);
    for (const key of ['threads', 'leads']) void queryClient.invalidateQueries({ queryKey: [key] });
  };
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Icon name="plus" />
        {t.inbox.registerNew}
      </Button>
      {open && (
        <Dialog title={t.inbox.registerNew} onClose={close} wide>
          <BookingModeContext.Provider value="sales">
            <ChatReturnContext.Provider value={close}>
              <BookingWizard initial={draftFromThread(thread)} primary={null} siblings={[]} onOpenStudent={noop} />
            </ChatReturnContext.Provider>
          </BookingModeContext.Provider>
        </Dialog>
      )}
    </>
  );
}
