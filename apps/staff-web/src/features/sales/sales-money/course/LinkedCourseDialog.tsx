import { useLinkedCourse } from './linked-course';
import { SalesCourseDialog } from './SalesCourseDialog';

/** For a number with no chat yet the chat frame is not rendered, so the dialog opens here. */
export function LinkedCourseDialog() {
  const [course, setCourse] = useLinkedCourse();
  return course ? <SalesCourseDialog studentId={course} onClose={() => setCourse(null)} /> : null;
}
