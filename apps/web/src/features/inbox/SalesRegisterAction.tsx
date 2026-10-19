import type { ThreadView } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { BookingWizard, type BookingWizardProps } from '@/features/booking/BookingWizard';
import { BookingModeContext, ChatReturnContext } from '@/features/booking/mode';
import { t } from '@/lib/i18n';
import { registerDrafts, resumable } from './register-drafts';
import { draftFromThread } from './sales-register';

const noop = () => undefined;

/** «تسجيل طالب جديد» in a lead's sales chat header; `compact` (the phone header, W3): an icon button. */
export function SalesRegisterButton({ compact, onOpen }: { compact: boolean; onOpen: () => void }) {
  return compact ? (
    <IconButton label={t.inbox.registerNew} onClick={onOpen} className="text-lapis">
      <Icon name="plus" />
    </IconButton>
  ) : (
    <Button type="button" size="sm" variant="secondary" onClick={onOpen}>
      <Icon name="plus" />
      {t.inbox.registerNew}
    </Button>
  );
}

/**
 * «تسجيل طالب جديد» (R-ASST-01, docs/16): the booking wizard in sales mode, in a dialog over the
 * conversation. Guardian + student + teacher + trial time, through /sales/booking, so the student is
 * credited to the salesperson (brought_by). No price, no invoice, no package. Closing it, or «ارجع
 * للمحادثة» after booking, stays in the same chat, refreshed (the number is a family now). Closing
 * with ✕ or Esc keeps the draft and step for this phone (docs/20 W9); a booking clears them. A past
 * first lesson is dropped on reopening (resumable), and one line says so (F). The sales chat holds
 * its open state above the width switch (useSalesFamilyActions, m13), with the lead thread as opened.
 */
export function SalesRegisterDialog({ thread, onClose }: { thread: ThreadView & { lead_id: string }; onClose: () => void }) {
  const queryClient = useQueryClient();
  const phone = thread.phone_e164;
  // A draft for another lead, or with a first lesson now past, does not resume as it was (review M3).
  const [saved] = useState(() => resumable(registerDrafts.get(phone), thread.lead_id, new Date()));
  // The «first lesson passed» line stays only until she picks a new time (round 3).
  const [pastShown, setPastShown] = useState(saved?.droppedPast ?? false);
  const onProgress = useCallback<NonNullable<BookingWizardProps['onProgress']>>(
    ({ draft, step, booked }) => {
      if (draft.startsAt) setPastShown(false);
      if (booked) registerDrafts.clear(phone);
      else registerDrafts.set(phone, { draft, step });
    },
    [phone],
  );
  const close = () => {
    onClose();
    for (const key of ['threads', 'leads']) void queryClient.invalidateQueries({ queryKey: [key] });
  };
  return (
    <Dialog title={t.inbox.registerNew} onClose={close} wide>
      {pastShown && <FormAlert className="mb-3">{t.booking.firstLessonPast}</FormAlert>}
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
  );
}
