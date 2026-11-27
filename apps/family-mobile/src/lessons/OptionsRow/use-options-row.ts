import { useState } from 'react';
import { t } from '@ab/mobile-kit';
import { optionsTitle, whenText } from '@/lessons/lesson-text';
import type { OptionsRowProps } from './OptionsRow.types';

export function useOptionsRow({
  lesson,
  clock,
  now,
}: Pick<OptionsRowProps, 'lesson' | 'clock' | 'now'>) {
  const [notice, setNotice] = useState<string | null>(null);
  const when = whenText(new Date(lesson.starts_at), clock, now);
  return {
    notice,
    setNotice,
    label: t.portal.actions.optionsFor.replace('{when}', when),
    title: optionsTitle(lesson, clock, now),
  };
}
