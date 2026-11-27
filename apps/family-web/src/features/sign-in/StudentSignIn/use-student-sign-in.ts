import { useState } from 'react';
import { t } from '@ab/web-kit';
import type { StudentSignInView } from './StudentSignIn.types';

export function useStudentSignIn() {
  const [view, setView] = useState<StudentSignInView>('password');
  const [saved, setSaved] = useState(false);
  const done = (ok: boolean) => {
    setSaved(ok);
    setView('password');
  };
  const links = [
    { label: t.familyAuth.firstTime, onClick: () => setView('firstTime') },
    { label: t.familyAuth.forgot, onClick: () => setView('forgot') },
  ];
  return { view, saved, done, links };
}
