import { createFileRoute } from '@tanstack/react-router';
import { MyStudents } from '@/features/sales/MyStudents';

/** /sales/students «طلابي» — the students I brought, when, first subscription paid or not, my commission. */
export const Route = createFileRoute('/sales/students')({ component: MyStudents });
