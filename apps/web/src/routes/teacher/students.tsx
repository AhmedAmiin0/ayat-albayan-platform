import { createFileRoute } from '@tanstack/react-router';
import { TeacherStudents } from '@/features/teaching/teacher-students/TeacherStudents';

/** /teacher/students «الطلاب» — my subscribed and my trial students, in two separate lists. */
export const Route = createFileRoute('/teacher/students')({ component: TeacherStudents });
