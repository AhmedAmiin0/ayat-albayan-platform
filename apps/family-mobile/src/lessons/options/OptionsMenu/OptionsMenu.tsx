import { lessonOptions } from '@ab/client-core';
import { AppText, Button, ErrorLine, Sheet, type, useTheme } from '@ab/mobile-kit';
import { DeclineForm } from '@/lessons/options/DeclineForm';
import type { OptionsMenuProps } from './OptionsMenu.types';
import { VARIANT } from './options-menu.helpers';
import { useOptionsMenu } from './use-options-menu';

export function OptionsMenu(props: OptionsMenuProps) {
  const { color } = useTheme();
  const {
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
  } = useOptionsMenu(props);
  return (
    <Sheet open={open} label={A.menuTitle} testID="lesson-options" onClose={close}>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}>
        {title.heading}
      </AppText>
      <AppText style={{ fontSize: type.size.sm, color: color.ink2 }}>{title.subline}</AppText>
      {error ? <ErrorLine message={error} /> : null}
      {declining ? (
        <DeclineForm
          lesson={lesson}
          title={title.decline}
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
    </Sheet>
  );
}
