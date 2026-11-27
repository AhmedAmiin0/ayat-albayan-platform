import { AskTimeSheet } from '@/lessons/options/AskTimeSheet';
import { OptionsMenu } from '@/lessons/options/OptionsMenu';
import type { LessonOptionsProps } from './LessonOptions.types';
import { OptionsTrigger } from './OptionsTrigger';
import { useLessonOptions } from './use-lesson-options';

/** The family's own buttons, never the WhatsApp quick reply; none once started or in a group. */
export function LessonOptions({
  lesson,
  student,
  now,
  title,
  onNotice,
  children,
}: LessonOptionsProps) {
  const o = useLessonOptions({ lesson, student, now, onNotice });
  if (!o.openMenu) return <OptionsTrigger open={null} render={children} />;
  return (
    <>
      <OptionsTrigger open={o.openMenu} render={children} />
      <OptionsMenu
        lesson={lesson}
        title={title}
        now={now}
        open={o.sheet === 'menu'}
        busy={o.busy}
        error={o.error}
        onClose={o.close}
        onPick={o.pick}
        onDecline={o.decline}
      />
      <AskTimeSheet
        lesson={lesson}
        student={student}
        open={o.sheet === 'ask'}
        busy={o.busy}
        error={o.error}
        onClose={o.close}
        onSend={o.send}
      />
    </>
  );
}
