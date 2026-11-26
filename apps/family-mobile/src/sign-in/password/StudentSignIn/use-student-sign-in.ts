import { useState } from 'react';
import type { StudentView } from './StudentSignIn.types';

export function useStudentSignIn() {
  const [view, setView] = useState<StudentView>('password');
  const toPassword = () => setView('password');
  return { view, setView, toPassword };
}
