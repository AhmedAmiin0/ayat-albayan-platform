import { useLinkedCourse } from './linked-course';
import { SalesCourseDialog } from './SalesCourseDialog';

/**
 * A «احجز أيام الحلقات» notice for a number with no chat yet (PR #642 review): the chat frame (and
 * its family actions) is not rendered then, so the linked student's «أيام الحلقات» opens here.
 */
export function LinkedCourseDialog() {
  const [course, setCourse] = useLinkedCourse();
  return course ? <SalesCourseDialog studentId={course} onClose={() => setCourse(null)} /> : null;
}
