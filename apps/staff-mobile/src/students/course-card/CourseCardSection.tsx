import { extendOffered, type CardTree } from '@ab/client-core';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { t } from '@ab/mobile-kit';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import { CourseActionsSection } from '@/students/course-actions/CourseActionsSection';
import { CoursePauseSection } from '@/students/course-pause/CoursePauseSection';
import { useCourseCard } from './course-card-api';
import { CardBox } from './CardBox';

interface CourseCardSectionProps {
  studentId: string;
  /** Whose route reads the card: the admin's file or the assistant's screen. */
  tree: CardTree;
  /** The package (sales' current one); absent = the server's current package. */
  subscriptionId?: string | null | undefined;
  /**
   * «تغيير المعلم» / «تغيير موعد الحلقات» / «مدّ الجدول» (sales: hers and a course exists);
   * absent = once the card has a booked course.
   */
  moves?: boolean;
  /** The package whose course the moves change (sales, owner 2026-11-06). */
  movesOf?: string | null | undefined;
  /** The package's rows («جدّد الاشتراك»), before «إلغاء الاشتراك». */
  extra?: ReactNode;
  /** The assistant's own «الحلقات القادمة» (with its lesson sheet) instead of the card's list. */
  upcoming?: ReactNode;
  /** The guardian's phone: the stop's done block opens the chat. */
  chatPhone?: string | undefined;
}

/**
 * «الدورة والباقة» (owner 2026-11-17) on the admin's student file and the assistant's «تفاصيل
 * الطالب»: the course (days, teacher and last day, lessons without a date), «الحلقات القادمة»,
 * then «إجراءات الدورة»: «إيقاف مؤقت» (or the pause's banner), «تغيير المعلم», «تغيير موعد
 * الحلقات», «مدّ الجدول», the package's rows and «إلغاء الاشتراك», each behind its key. The moves
 * need a booked course (no dead end on course_not_found).
 */
export function CourseCardSection(props: CourseCardSectionProps) {
  const { studentId, tree } = props;
  const card = useCourseCard({ studentId, tree }).data;
  return (
    <View style={{ gap: 12 }}>
      <SectionLabel>{t.courseCard.title}</SectionLabel>
      <CardBox card={card} upcoming={props.upcoming} />
      <SectionLabel>{t.courseCard.actions}</SectionLabel>
      <View>
        <CoursePauseSection studentId={studentId} />
        <CourseActionsSection
          studentId={studentId}
          subscriptionId={props.subscriptionId}
          moves={props.moves ?? card?.course != null}
          movesOf={props.movesOf}
          extend={extendOffered(card)}
          extra={props.extra}
          chatPhone={props.chatPhone}
        />
      </View>
    </View>
  );
}
