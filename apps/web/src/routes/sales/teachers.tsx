import { createFileRoute } from '@tanstack/react-router';
import { SalesTeachers } from '@/features/sales/sales/teachers/SalesTeachers';

/** /sales/teachers «المعلمون» — every active teacher and their students (read-only, docs/16). */
export const Route = createFileRoute('/sales/teachers')({ component: SalesTeachers });
