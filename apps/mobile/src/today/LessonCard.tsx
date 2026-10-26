import {
  applyLessonEvent,
  lessonStatusStyle,
  subscriptionStatusStyle,
  type CancelRequest,
  type LessonEvent,
  type LessonView,
} from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { JoinClassroomButton } from '@/classroom/links/JoinClassroomButton';
import { editMode } from '@/edit-time/lib/types';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { LiveBadge } from '@/live/LiveBadge';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Ltr } from '@/core/ui/primitives/Ltr';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { CancelLesson } from './CancelLesson';
import { LessonActions } from './LessonActions';
import { lessonSubtitle } from './lesson-text';
import { PackageLine } from './PackageLine';

export interface LessonCardProps {
  lesson: LessonView;
  /** This lesson's change is on its way. */
  busy: boolean;
  /** Why this lesson's last change was refused; the card already shows the old status again. */
  error?: string;
  onConfirm: () => void;
  onCancel: (cancel: CancelRequest) => void;
  /** «غيّر الميعاد»: opens the reschedule sheet for this lesson. */
  onReschedule: () => void;
  /** «عدّل الوقت» (R-SCH-11): opens the edit sheet; the button shows when the lesson allows it. */
  onEditTime?: () => void;
}

/**
 * A lesson still ahead (or under way): students with their AB codes, the status chip, teacher,
 * length and the student's clock, each student's package line, and «الباقة مش مدفوعة» when the API
 * flags the student (R-SUB-02). «يحتاج تأكيد» carries the saffron start edge (docs/07 §12).
 * An action shows only if the API offered it and the shared state machine still allows it from
 * the status on screen (which may already be the optimistic one).
 */
export function LessonCard({ lesson, busy, error, onConfirm, onCancel, onReschedule, onEditTime }: LessonCardProps) {
  const { color } = useTheme();
  const [cancelling, setCancelling] = useState(false);
  const can = (e: LessonEvent) =>
    lesson.allowed_events.includes(e) && applyLessonEvent(lesson.status, e) !== null;
  const canConfirm = can('confirm');
  const canCancel = can('cancel_by_admin');
  const canMove = can('reschedule');
  const needsConfirm = lesson.status === 'scheduled';
  return (
    <View
      style={{
        gap: 8,
        padding: 12,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: color.rule,
        borderStartWidth: needsConfirm ? 4 : 1,
        borderStartColor: needsConfirm ? color.act : color.rule,
        backgroundColor: color.raised,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1, gap: 2 }}>
          {lesson.students.map((s) => (
            <View key={s.id}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <AppText
                  numberOfLines={1}
                  style={{
                    flexShrink: 1,
                    fontFamily: type.ui[700],
                    fontSize: type.size.base,
                    lineHeight: type.lineHeight(type.size.base),
                    color: color.ink,
                  }}
                >
                  {s.name}
                </AppText>
                <Ltr
                  style={{
                    fontFamily: type.ui[500],
                    fontSize: type.size['2xs'],
                    color: color.ink3,
                  }}
                >
                  {s.code}
                </Ltr>
              </View>
              <PackageLine studentId={s.id} />
              {s.unpaid ? (
                <View style={{ alignItems: 'flex-start', paddingTop: 2 }}>
                  <StatusChip {...subscriptionStatusStyle.unpaid} label={t.subscriptions.unpaidFlag} size="sm" />
                </View>
              ) : null}
            </View>
          ))}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <LiveBadge lesson={lesson} />
          <StatusChip
            {...lessonStatusStyle[lesson.status]}
            label={t.enums.lessonStatus[lesson.status]}
            size="sm"
          />
        </View>
      </View>
      <AppText
        style={{
          fontFamily: type.ui[400],
          fontSize: type.size.xs,
          lineHeight: type.lineHeight(type.size.xs),
          color: color.ink2,
          fontVariant: ['tabular-nums'],
        }}
      >
        {lessonSubtitle(lesson)}
      </AppText>
      {error ? <ErrorLine message={error} /> : null}
      {cancelling && canCancel ? (
        <CancelLesson lesson={lesson} onSubmit={onCancel} onClose={() => setCancelling(false)} />
      ) : (
        <LessonActions
          busy={busy}
          canConfirm={canConfirm}
          canCancel={canCancel}
          canMove={canMove}
          onConfirm={onConfirm}
          onCancel={() => setCancelling(true)}
          onReschedule={onReschedule}
          canEditTime={onEditTime !== undefined && editMode(lesson) !== null}
          onEditTime={onEditTime}
        />
      )}
      <JoinClassroomButton lesson={lesson} />
    </View>
  );
}
