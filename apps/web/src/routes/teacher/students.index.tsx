import { createFileRoute } from '@tanstack/react-router';
import { TeacherStudents } from '@/features/teaching/teacher-students';

/** /teacher/students «الطلاب» — the same TeacherBoard as the home «طلابي» tab; rows open the file. */
export const Route = createFileRoute('/teacher/students/')({ component: TeacherStudents });
