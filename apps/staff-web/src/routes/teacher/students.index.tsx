import { createFileRoute } from '@tanstack/react-router';
import { TeacherStudents } from '@/features/teaching/teacher-students';

export const Route = createFileRoute('/teacher/students/')({ component: TeacherStudents });
