import { pathKey } from '@ab/mobile-kit';
import type { InvoiceKeys, SalesCourseKeys, StudentKeys } from './staff.keys.types';

const students = pathKey('/students');
const invoices = pathKey('/invoices');
const course = pathKey('/sales/booking/course');
const booking = pathKey('/sales/booking');

export const studentKeys: StudentKeys = {
  all: students,
  one: (id) => [...students, id],
  statusCounts: (filters) => [...students, 'status-counts', filters],
  teacherOptions: () => [...students, 'teacher-options'],
};

export const invoiceKeys: InvoiceKeys = {
  all: invoices,
  ofStudent: (studentId) => [...invoices, 'student', studentId],
};

// The checks are keyed by the request body (JSON) so a new pick asks again.
export const salesCourseKeys: SalesCourseKeys = {
  course: (studentId) => [...course, { studentId }],
  check: (body) => [...booking, 'check', body],
  changeCheck: (path, body) => [...booking, 'course-change', 'check', path, body],
};
