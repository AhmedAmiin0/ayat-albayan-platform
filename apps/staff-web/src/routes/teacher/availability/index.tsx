import { createFileRoute } from '@tanstack/react-router';
import { TeacherAvailabilityPage } from '@/features/teaching/teacher';

/** /teacher/availability «المواعيد المتاحة» — her weekly hours and time off (owner 2026-11-14). */
export const Route = createFileRoute('/teacher/availability/')({ component: TeacherAvailabilityPage });
