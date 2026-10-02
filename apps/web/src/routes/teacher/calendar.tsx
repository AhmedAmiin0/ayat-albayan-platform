import { createFileRoute } from '@tanstack/react-router';
import { MyWeek } from '@/features/teacher/MyWeek';

/** /teacher/calendar «جدولي» — my lessons on the week grid (R-TCH-03, R-SCH-08). */
export const Route = createFileRoute('/teacher/calendar')({ component: MyWeek });
