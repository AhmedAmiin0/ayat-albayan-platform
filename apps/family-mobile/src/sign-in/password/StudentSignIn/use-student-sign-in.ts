import { useState } from 'react';
import { t } from '@ab/mobile-kit';
import { studentCodeOnTrack } from '@ab/client-core';
import { feel } from '@/sign-in/feedback';
import type { StudentView } from './StudentSignIn.types';

export function useStudentSignIn() {
  const [view, setView] = useState<StudentView>('password');
  const toPassword = () => setView('password');
  const checkCode = (typed: string) =>
    studentCodeOnTrack(typed) ? null : t.familyApp.signIn.studentCodeBad;
  const onResult = (ok: boolean) => feel(ok ? null : 'refused');
  return { view, setView, toPassword, checkCode, onResult };
}
