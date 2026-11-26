import type { ThreadView } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Dialog, FormAlert, Icon, IconButton, t } from '@ab/web-kit';
import { BookingWizard, type BookingWizardProps } from '@/features/teaching/booking/BookingWizard';
import { BookingModeContext, ChatReturnContext } from '@/features/teaching/booking/mode';
import { threadKeys } from '@/features/messaging/inbox/api/keys';
import { leadKeys } from '@/features/sales/keys';
import { registerDrafts, resumable } from './register-drafts';
import { draftFromThread } from './sales-register';

const noop = () => undefined;

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

/** Booked via /sales/booking so the student is credited to the salesperson (R-ASST-01, docs/16). */
export function SalesRegisterDialog({
  thread,
  onClose,
}: {
  thread: ThreadView & { lead_id: string };
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const phone = thread.phone_e164;
  // A draft for another lead, or with a first lesson now past, does not resume as it was (review M3).
  const [saved] = useState(() => resumable(registerDrafts.get(phone), thread.lead_id, new Date()));
  // The «first lesson passed» line stays only until she picks a new time (round 3).
  const [pastShown, setPastShown] = useState(saved?.droppedPast ?? false);
  const onProgress: NonNullable<BookingWizardProps['onProgress']> = ({ draft, step, booked }) => {
    if (draft.startsAt) setPastShown(false);
    if (booked) registerDrafts.clear(phone);
    else registerDrafts.set(phone, { draft, step });
  };
  const close = () => {
    onClose();
    for (const queryKey of [threadKeys.all, leadKeys.all])
      void queryClient.invalidateQueries({ queryKey });
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
