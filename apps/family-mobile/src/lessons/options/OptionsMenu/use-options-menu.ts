import type { LessonOption } from '@ab/client-core';
import { useState } from 'react';
import { t } from '@ab/mobile-kit';
import type { OptionsMenuProps } from './OptionsMenu.types';

export function useOptionsMenu(props: OptionsMenuProps) {
  const { lesson, title, now, open, busy, error, onClose, onPick, onDecline } = props;
  const [declining, setDeclining] = useState(false);
  const close = () => {
    setDeclining(false);
    onClose();
  };
  const pick = (o: LessonOption) => (o === 'decline' ? setDeclining(true) : onPick(o));
  const A = t.portal.actions;
  return {
    lesson,
    title,
    now,
    open,
    busy,
    error,
    onDecline,
    declining,
    setDeclining,
    close,
    pick,
    A,
  };
}
