import { createFileRoute } from '@tanstack/react-router';
import { AllStudents } from '@/features/sales/AllStudents';

/** /sales/all-students «كل الطلاب» — every student of the academy, next to «طلابي» (read-only, docs/16). */
export const Route = createFileRoute('/sales/all-students')({ component: AllStudents });
