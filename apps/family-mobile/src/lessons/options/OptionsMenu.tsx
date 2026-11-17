import { lessonOptions, type LessonOption } from '@ab/client-core';
import type { PortalLesson } from '@ab/shared';
import { useState } from 'react';
import { AppText, Button, ErrorLine, MenuSheet, t, type, useTheme } from '@ab/mobile-kit';
import { DeclineForm } from './DeclineForm';

interface OptionsMenuProps {
  lesson: PortalLesson;
  /** «حلقة الغد · 6:30 م – 7:15 م». */
  heading: string;
  now: Date;
  open: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onPick: (option: Exclude<LessonOption, 'decline'>) => void;
  onDecline: (reason: string) => void;
}

const VARIANT: Readonly<Record<LessonOption, 'primary' | 'secondary' | 'ghost'>> = {
  confirm: 'primary',
  request: 'secondary',
  withdraw: 'secondary',
  decline: 'ghost',
};

/**
 * «خيارات الحلقة» (owner 2026-11-17): the kit's bottom menu with what this lesson still allows —
 * «سأحضر», «اطلب موعدًا آخر» / «سحب الطلب», «أعتذر عن الحلقة» (which opens its form in place).
 */
export function OptionsMenu(props: OptionsMenuProps) {
  const { lesson, heading, now, open, busy, error, onClose, onPick, onDecline } = props;
  const { color } = useTheme();
  const [declining, setDeclining] = useState(false);
  const close = () => {
    setDeclining(false);
    onClose();
  };
  const pick = (o: LessonOption) => (o === 'decline' ? setDeclining(true) : onPick(o));
  const A = t.portal.actions;
  return (
    <MenuSheet open={open} label={A.menuTitle} testID="lesson-options" onClose={close}>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}>
        {heading}
      </AppText>
      {error ? <ErrorLine message={error} /> : null}
      {declining ? (
        <DeclineForm
          lesson={lesson}
          busy={busy}
          onDecline={onDecline}
          onBack={() => setDeclining(false)}
        />
      ) : (
        lessonOptions(lesson, now).map((o) => (
          <Button
            key={o}
            variant={VARIANT[o]}
            label={A[o]}
            onPress={() => pick(o)}
            disabled={busy}
          />
        ))
      )}
    </MenuSheet>
  );
}
