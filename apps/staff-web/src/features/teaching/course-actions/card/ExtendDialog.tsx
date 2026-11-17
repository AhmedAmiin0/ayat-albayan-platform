import { courseExtendErrorCode } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { extendPreviewQuery, useExtendCourse } from './api';
import { extendDoneText } from './card-text';
import { ExtendPreviewList } from './ExtendPreviewList';

interface ExtendDialogProps {
  studentId: string;
  subscriptionId: string;
  onClose: () => void;
  /** After the booking and the re-read: what was booked. */
  onDone: (message: string) => void;
}

/**
 * «مدّ الجدول حتى نهاية الباقة؟» (owner 2026-11-17): the lessons it books on the course's own days
 * with their dates and the new last day, that nobody is told, then «مدّ الجدول» beside «رجوع».
 */
export function ExtendDialog({ studentId, subscriptionId, onClose, onDone }: ExtendDialogProps) {
  const preview = useQuery(extendPreviewQuery({ studentId, subscriptionId }));
  const done = (result: Parameters<typeof extendDoneText>[0]) => onDone(extendDoneText(result));
  const extend = useExtendCourse({ studentId, subscriptionId, onDone: done });
  const words = t.courseCard.extend;
  const empty = !preview.data?.starts.length;
  const error = preview.error ?? extend.error;
  const actions = (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>
        {t.common.back}
      </Button>
      <Button type="button" disabled={empty || extend.isPending} onClick={() => extend.mutate()}>
        {extend.isPending ? t.common.saving : words.confirm}
      </Button>
    </>
  );
  return (
    <Dialog layout="sheet" title={words.title} onClose={onClose} actions={actions}>
      <div className="grid gap-3 text-sm">
        <p className="font-semibold">{words.ask}</p>
        {!preview.isError && <ExtendPreviewList preview={preview.data} />}
        <p className="text-ink-2">{t.courseCard.notifyNone}</p>
        {error && <FormAlert>{t.courseActions.errors[courseExtendErrorCode(error)]}</FormAlert>}
      </div>
    </Dialog>
  );
}
