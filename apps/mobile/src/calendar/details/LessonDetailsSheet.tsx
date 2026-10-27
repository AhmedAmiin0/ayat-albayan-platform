import type { ReactNode } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/core/ui/primitives/Button';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { DetailsAbout } from './DetailsAbout';
import { DetailsHead } from './DetailsHead';
import { DetailsStudents } from './DetailsStudents';
import { DetailsWhen } from './DetailsWhen';
import type { DetailsLesson, DetailsRole } from './details-text';

interface LessonDetailsSheetProps<L extends DetailsLesson> {
  /** The lesson to show; null = closed. */
  lesson: L | null;
  role: DetailsRole;
  onClose: () => void;
  /** The row's own actions for this role (تأكيد / إلغاء / عدّل الوقت / غيّر الميعاد / ادخل الحلقة…), under the details. */
  actions?: (lesson: L) => ReactNode;
  /**
   * The screen's sheets an action opens (غيّر الميعاد, عدّل الوقت): mounted inside this modal while it
   * is open, so iOS presents them over it, and beside it (for the row's own buttons) while it is closed.
   */
  sheets?: ReactNode;
  /** «للاطلاع فقط» under the actions; sales' default, false on a lesson she may move or cancel (docs/16 row 37). */
  readOnly?: boolean;
}

/**
 * «تفاصيل الحلقة» (owner 2026-10-26: tap a lesson in the schedule to see more): a page sheet over
 * the schedule, like «غيّر الميعاد», so a swipe down, the back button or «إغلاق» closes it and the
 * list stays put. Compact groups, most-read first: status and tags with the same actions the row
 * offers under them, then «الموعد», «الطلاب» and «بيانات الحلقة». Sales reads it with «للاطلاع
 * فقط» and only «ادخل الحلقة». A tap that navigates closes the sheet first.
 */
export function LessonDetailsSheet<L extends DetailsLesson>(props: LessonDetailsSheetProps<L>) {
  const { lesson, role, onClose, actions, sheets, readOnly = role === 'sales' } = props;
  const title = lesson ? lesson.students.map((s) => s.name).join(t.common.listSeparator) : '';
  return (
    <>
      <Modal visible={lesson !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <Screen sheet>
          <ScreenHeader
            size="h2"
            title={title || t.lessons.details}
            subtitle={title ? t.lessons.details : undefined}
            trailing={<Button variant="ghost" label={t.common.close} onPress={onClose} />}
          />
          <ScrollView
            style={{ flex: 1, marginHorizontal: -16 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 10 }}
            // «إلغاء» opens its reason field inside the sheet: a tap must land with the keyboard up.
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            {lesson ? (
              <>
                <DetailsHead lesson={lesson} />
                {/* The row's actions right under the status: in view without scrolling a group lesson. */}
                {actions ? <View style={{ gap: 8 }}>{actions(lesson)}</View> : null}
                {readOnly ? <Note>{t.lessons.sheet.readOnly}</Note> : null}
                <DetailsWhen lesson={lesson} />
                <DetailsStudents lesson={lesson} role={role} onLeave={onClose} />
                <DetailsAbout lesson={lesson} role={role} />
              </>
            ) : null}
          </ScrollView>
        </Screen>
        {lesson ? sheets : null}
      </Modal>
      {lesson ? null : sheets}
    </>
  );
}
