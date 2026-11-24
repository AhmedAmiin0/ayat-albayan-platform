import { courseExtendErrorCode, extendDoneLines } from '@ab/client-core';
import type { CourseExtendResult } from '@ab/shared';
import { View } from 'react-native';
import { t, ErrorLine } from '@ab/mobile-kit';
import { Note } from '@/more';
import { SheetActions } from '@/students/course-pause/SheetActions';
import { SheetLines } from '@/students/course-actions/SheetLines';
import { useViewerTz } from '@/core/lib/clock';
import { localDay } from '@/payments';
import { extendLines } from './card-text';
import { useExtendCourse, useExtendPreview } from './course-card-api';

interface ExtendFormProps {
  sub: { studentId: string; subscriptionId: string };
  onClose: () => void;
  /** Booked: the file says how many lessons and the new last day. */
  onDone: (text: string) => void;
}

function doneText(result: CourseExtendResult): string {
  const words = { ...t.courseCard.extend, endsOn: t.courseActions.endsOn };
  return extendDoneLines({ result, words, date: localDay }).join('\n');
}

/** Books on the course's own days; nobody is told. */
export function ExtendForm({ sub, onClose, onDone }: ExtendFormProps) {
  const tz = useViewerTz();
  const preview = useExtendPreview(sub);
  const extend = useExtendCourse(sub.studentId);
  const c = t.courseCard;
  if (!preview.data) {
    const code = courseExtendErrorCode(preview.error);
    if (preview.isError) return <ErrorLine message={t.courseActions.errors[code]} />;
    return <SheetLines lines={[t.common.loading]} />;
  }
  const none = preview.data.starts.length === 0;
  const submit = () => extend.mutate(sub.subscriptionId, { onSuccess: (r) => onDone(doneText(r)) });
  return (
    <View style={{ gap: 12 }}>
      <SheetLines lines={[c.extend.ask, ...extendLines(preview.data, tz)]} />
      <Note>{c.notifyNone}</Note>
      {extend.isError ? (
        <ErrorLine message={t.courseActions.errors[courseExtendErrorCode(extend.error)]} />
      ) : null}
      {none ? null : (
        <SheetActions
          label={c.extend.confirm}
          busy={extend.isPending}
          onConfirm={submit}
          onCancel={onClose}
        />
      )}
    </View>
  );
}
