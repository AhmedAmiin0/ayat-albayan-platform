import type { CourseMoveKind } from '@ab/client-core';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { PauseSheetFrame } from '@/students/course-pause/PauseSheetFrame';
import { ActionButtons, useActionKeys, type Open } from './ActionButtons';
import { useCurrentSubscription } from './course-actions-api';
import { CourseMoveSheet } from './CourseMoveSheet';
import { CourseStopForm } from './CourseStopForm';

interface CourseActionsSectionProps {
  studentId: string;
  /** The package; absent or null = the student's current one, as the server answers it. */
  subscriptionId?: string | null | undefined;
}

const isMove = (open: Open): open is CourseMoveKind => open === 'teacher' || open === 'times';

/**
 * «إلغاء الاشتراك» / «تغيير المعلم» / «تغيير موعد الحلقات» in the admin's student file and sales'
 * «تفاصيل الطالب» (owner 2026-10-30), ANY student, each behind its own key. Nothing without a
 * package or a key.
 */
export function CourseActionsSection({ studentId, subscriptionId }: CourseActionsSectionProps) {
  const keys = useActionKeys();
  const sub = useCurrentSubscription({ studentId, given: subscriptionId, keys });
  const [open, setOpen] = useState<Open>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const c = t.courseActions;
  if (!sub || (!keys.any && notice === null)) return null;
  const close = () => setOpen(null);
  const done = (text: string) => {
    setOpen(null);
    setNotice(text);
  };
  const moveDone = open === 'teacher' ? c.teacher.done : c.times.done;
  return (
    <View style={{ gap: 8 }}>
      {notice ? <Note>{notice}</Note> : null}
      <ActionButtons
        keys={keys}
        onOpen={(next) => {
          setNotice(null);
          setOpen(next);
        }}
      />
      <PauseSheetFrame open={open === 'stop'} title={c.stop.title} onClose={close}>
        <CourseStopForm
          sub={{ studentId, subscriptionId: sub }}
          onClose={close}
          onDone={() => done(c.stop.done)}
        />
      </PauseSheetFrame>
      {isMove(open) ? (
        <CourseMoveSheet
          sub={{ studentId, subscriptionId: sub }}
          kind={open}
          onClose={close}
          onDone={() => done(moveDone)}
        />
      ) : null}
    </View>
  );
}
