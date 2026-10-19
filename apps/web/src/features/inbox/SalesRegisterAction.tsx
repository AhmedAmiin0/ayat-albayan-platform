import type { ThreadView } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { BookingWizard, type BookingWizardProps } from '@/features/booking/BookingWizard';
import { BookingModeContext, ChatReturnContext } from '@/features/booking/mode';
import { t } from '@/lib/i18n';
import { useInboxMode } from './mode';
import { registerDrafts, resumable } from './register-drafts';
import { canRegisterFrom, draftFromThread } from './sales-register';

const noop = () => undefined;

/**
 * «تسجيل طالب جديد» in a sales chat (R-ASST-01, docs/16): the booking wizard in sales mode, in a dialog
 * over the conversation. Guardian + student + teacher + trial time, through /sales/booking, so the
 * student is credited to the salesperson (brought_by). No price, no invoice, no package. Closing it, or
 * «ارجع للمحادثة» after booking, stays in the same chat, refreshed (the number is a family now).
 * Closing with ✕ or Esc keeps the draft and step for this phone (docs/20 W9); a booking clears them.
 * A past first lesson is dropped on reopening (resumable).
 * `compact` (the phone header, W3): an icon button named «تسجيل طالب جديد».
 */
export function SalesRegisterAction({ thread, compact = false }: { thread: ThreadView; compact?: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const phone = thread.phone_e164;
  const onProgress = useCallback<NonNullable<BookingWizardProps['onProgress']>>(
    ({ draft, step, booked }) => (booked ? registerDrafts.clear(phone) : registerDrafts.set(phone, { draft, step })),
    [phone],
  );
  if (useInboxMode() !== 'sales' || !canRegisterFrom(thread)) return null;
  const close = () => {
    setOpen(false);
    for (const key of ['threads', 'leads']) void queryClient.invalidateQueries({ queryKey: [key] });
  };
  // A draft for another lead, or with a first lesson now past, does not resume as it was (review M3).
  const saved = resumable(registerDrafts.get(phone), thread.lead_id, new Date());
  return (
    <>
      {compact ? (
        <IconButton label={t.inbox.registerNew} onClick={() => setOpen(true)} className="text-lapis">
          <Icon name="plus" />
        </IconButton>
      ) : (
        <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
          <Icon name="plus" />
          {t.inbox.registerNew}
        </Button>
      )}
      {open && (
        <Dialog title={t.inbox.registerNew} onClose={close} wide>
          <BookingModeContext.Provider value="sales">
            <ChatReturnContext.Provider value={close}>
              <BookingWizard
                initial={saved?.draft ?? draftFromThread(thread)}
                initialStep={saved?.step}
                onProgress={onProgress}
                primary={null}
                siblings={[]}
                onOpenStudent={noop}
              />
            </ChatReturnContext.Provider>
          </BookingModeContext.Provider>
        </Dialog>
      )}
    </>
  );
}
