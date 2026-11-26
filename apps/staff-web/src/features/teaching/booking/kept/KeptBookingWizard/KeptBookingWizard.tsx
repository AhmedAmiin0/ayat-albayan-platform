import { useState } from 'react';
import { BookingWizard, type BookingWizardProps } from '@/features/teaching/booking/BookingWizard';
import { isUnfinished } from '@/features/teaching/booking/kept/kept-rules';
import { readKept, saveKept } from '@/features/teaching/booking/kept/kept-store';
import type { KeptBookingWizardProps } from './KeptBookingWizard.types';

/** The admin wizard, resumed from the tab's kept draft for its entry (R-SCH-06). */
export function KeptBookingWizard({ keepKey, onUnfinished, ...wizard }: KeptBookingWizardProps) {
  const [fresh] = useState(wizard.initial);
  const [kept] = useState(() => readKept(keepKey));
  const onProgress: NonNullable<BookingWizardProps['onProgress']> = (progress) => {
    const unfinished = isUnfinished(fresh, progress);
    saveKept(keepKey, unfinished ? { draft: progress.draft, step: progress.step } : null);
    onUnfinished?.(unfinished);
  };
  return (
    <BookingWizard
      {...wizard}
      initial={kept?.draft ?? fresh}
      initialStep={kept?.step}
      onProgress={onProgress}
    />
  );
}
