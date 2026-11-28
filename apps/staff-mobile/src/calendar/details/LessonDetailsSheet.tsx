import type { ReactNode } from 'react';
import { Modal, View } from 'react-native';
import { SheetLeave } from '@/classroom';
import { t, Button, Screen, ScreenHeader, KeyboardScroll } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
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
  /** The row's own actions for this role, under the details. */
  actions?: (lesson: L) => ReactNode;
  /** Mounted inside this modal while open so iOS presents them over it, beside it while closed. */
  sheets?: ReactNode;
  /** Sales' default; false on a lesson she may move or cancel (docs/16 row 37). */
  readOnly?: boolean;
  /** Opened from this student's file: the name is not a link (no second copy of the screen). */
  hereStudentId?: string | undefined;
  /** The teacher's report button goes here, in the current tab (docs/48); else reportHref. */
  onReport?: (lessonId: string) => void;
}

/** A page sheet so the list stays put; a tap that navigates closes the sheet first. */
export function LessonDetailsSheet<L extends DetailsLesson>(props: LessonDetailsSheetProps<L>) {
  const { lesson, role, onClose, actions, sheets, readOnly = role === 'sales' } = props;
  const { hereStudentId, onReport } = props;
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
          <KeyboardScroll
            style={{ flex: 1, marginHorizontal: -16 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 10 }}
            // Cancel opens its reason field in the sheet: it scrolls above the keyboard, taps land.
          >
            {lesson ? (
              <>
                <DetailsHead lesson={lesson} />
                {/* The row's actions right under the status: in view without scrolling a group lesson. */}
                {/* Joining closes this sheet before the room opens (Android's Modal). */}
                {actions ? (
                  <SheetLeave value={onClose}>
                    <View style={{ gap: 8 }}>{actions(lesson)}</View>
                  </SheetLeave>
                ) : null}
                {readOnly ? <Note>{t.lessons.sheet.readOnly}</Note> : null}
                <DetailsWhen lesson={lesson} />
                <DetailsStudents
                  lesson={lesson}
                  role={role}
                  onLeave={onClose}
                  hereStudentId={hereStudentId}
                  onReport={onReport}
                />
                <DetailsAbout lesson={lesson} role={role} />
              </>
            ) : null}
          </KeyboardScroll>
        </Screen>
        {lesson ? sheets : null}
      </Modal>
      {lesson ? null : sheets}
    </>
  );
}
