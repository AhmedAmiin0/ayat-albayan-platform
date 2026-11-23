import { createFileRoute } from '@tanstack/react-router';
import { TeacherAvailabilityPage } from '@/features/teaching/teacher';

export const Route = createFileRoute('/teacher/availability/')({ component: TeacherAvailabilityPage });
