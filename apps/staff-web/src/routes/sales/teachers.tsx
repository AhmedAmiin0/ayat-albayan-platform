import { createFileRoute } from '@tanstack/react-router';
import { SalesTeachers } from '@/features/sales/sales/teachers/SalesTeachers';

export const Route = createFileRoute('/sales/teachers')({ component: SalesTeachers });
