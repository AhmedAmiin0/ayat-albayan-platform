import { type ReactNode, useMemo } from 'react';
import { ThreadModeProvider } from '@/inbox/thread/hooks/thread-mode';
import { NotLinkedScreen } from '../screens/NotLinkedScreen';
import { isNotLinked, useTeacherMe } from '../lib/queries';

/**
 * What every teacher screen runs inside, her tabs and her chat above them ((teacher-chat)): the
 * shared chat screens in teacher mode (her threads, no admin actions). A login with no teachers row
 * (404 `teacher_not_linked`) gets one screen that says so, and sign-out.
 */
export function TeacherScope({ children }: { children: ReactNode }) {
  const me = useTeacherMe();
  const teacherId = me.data?.id ?? '';
  // One object per teacher: a new one each render would redraw every row of her chat list.
  const mode = useMemo(() => ({ kind: 'teacher', teacherId }) as const, [teacherId]);
  if (!me.data && isNotLinked(me.error)) return <NotLinkedScreen />;
  return (
    <ThreadModeProvider value={mode}>
      {children}
    </ThreadModeProvider>
  );
}
