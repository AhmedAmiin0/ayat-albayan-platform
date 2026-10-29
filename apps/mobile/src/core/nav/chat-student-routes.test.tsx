import { AdminReportScreen, AdminStudentReportsScreen } from '@/ops';
import { PaymentScreen } from '@/payments';
import { AttendanceLogScreen, SalesStudentScreen } from '@/sales';
import { AdminChannelScreen, StudentMoneyScreen, StudentRecordingsScreen } from '@/student-file';
import { StudentScreen } from '@/students';
import { SubscribeScreen } from '@/subscribe';
import { TrialDateScreen } from '@/trial-date';
import AdminAttendance from '../../../app/(admin-chat)/inbox/student/[id]/attendance';
import AdminFile from '../../../app/(admin-chat)/inbox/student/[id]';
import AdminChannel from '../../../app/(admin-chat)/inbox/student/channel/[id]';
import AdminMoney from '../../../app/(admin-chat)/inbox/student/money/[id]';
import AdminPayment from '../../../app/(admin-chat)/inbox/student/payment/[id]';
import AdminRecordings from '../../../app/(admin-chat)/inbox/student/recordings/[id]';
import AdminReports from '../../../app/(admin-chat)/inbox/student/reports/[id]';
import AdminReport from '../../../app/(admin-chat)/inbox/student/reports/view/[reportId]';
import AdminSubscribe from '../../../app/(admin-chat)/inbox/student/subscribe';
import AdminTrialDate from '../../../app/(admin-chat)/inbox/student/trial-date/[studentId]';
import SalesAttendance from '../../../app/(sales-chat)/sales/inbox/student/[id]/attendance';
import SalesFile from '../../../app/(sales-chat)/sales/inbox/student/[id]';
import { chatStudentHref } from './tree-base';

// Review 2026-10-30: every route the student file opened from a chat links to (useStudentHref) has its copy in
// the chat group, showing the tab's screen; a missing copy would open «unmatched route» instead.
test.each([
  ['/students/s1', '/inbox/student/s1', AdminFile, StudentScreen],
  ['/students/s1/attendance', '/inbox/student/s1/attendance', AdminAttendance, AttendanceLogScreen],
  ['/students/reports/s1', '/inbox/student/reports/s1', AdminReports, AdminStudentReportsScreen],
  ['/students/reports/view/r1', '/inbox/student/reports/view/r1', AdminReport, AdminReportScreen],
  ['/students/payment/s1', '/inbox/student/payment/s1', AdminPayment, PaymentScreen],
  ['/students/money/s1', '/inbox/student/money/s1', AdminMoney, StudentMoneyScreen],
  ['/students/channel/s1', '/inbox/student/channel/s1', AdminChannel, AdminChannelScreen],
  ['/students/recordings/s1', '/inbox/student/recordings/s1', AdminRecordings, StudentRecordingsScreen],
  ['/students/subscribe', '/inbox/student/subscribe', AdminSubscribe, SubscribeScreen],
  ['/students/trial-date/s1', '/inbox/student/trial-date/s1', AdminTrialDate, TrialDateScreen],
  ['/sales/students/s1', '/sales/inbox/student/s1', SalesFile, SalesStudentScreen],
  ['/sales/students/s1/attendance', '/sales/inbox/student/s1/attendance', SalesAttendance, AttendanceLogScreen],
] as const)('%s from a chat opens %s, the same screen', (tab, chat, copy, screen) => {
  expect(chatStudentHref(tab)).toBe(chat);
  expect(copy).toBe(screen);
});
