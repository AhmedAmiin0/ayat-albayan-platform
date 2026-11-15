import { createFileRoute } from '@tanstack/react-router';
import { TeacherStudents } from '@/features/teaching/teacher-students';

/** /teacher/students «الطلاب»: the home's TeacherBoard; rows open the file. */
export const Route = createFileRoute('/teacher/students/')({ component: TeacherStudents });
