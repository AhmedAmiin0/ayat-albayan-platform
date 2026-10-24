import AppLayout from '../../app/_layout';
import ChatLayout from '../../app/(admin-chat)/_layout';
import BookRoute from '../../app/(admin-chat)/inbox/book';
import SalesCourseRoute from '../../app/(admin-chat)/inbox/sales-course';
import SalesSubscribeRoute from '../../app/(admin-chat)/inbox/sales-subscribe';
import SalesTransferRoute from '../../app/(admin-chat)/inbox/sales-transfer';
import SubscribeRoute from '../../app/(admin-chat)/inbox/subscribe';
import ThreadRoute from '../../app/(admin-chat)/inbox/thread/[phone]';
import TabsLayout from '../../app/(tabs)/_layout';
import Today from '../../app/(tabs)/index';
import Schedule from '../../app/(tabs)/schedule';
import LeadRoute from '../../app/(tabs)/inbox/[id]';
import InboxLayout from '../../app/(tabs)/inbox/_layout';
import InboxIndex from '../../app/(tabs)/inbox/index';
import Login from '../../app/login';
import FinanceExpenses from '../../app/(tabs)/more/finance/expenses';
import FinanceInvoices from '../../app/(tabs)/more/finance/invoices';
import FinancePayouts from '../../app/(tabs)/more/finance/payouts';
import FinanceSummary from '../../app/(tabs)/more/finance/summary';
import MoreLayout from '../../app/(tabs)/more/_layout';
import MoreIndex from '../../app/(tabs)/more/index';
import TeacherRoute from '../../app/(tabs)/more/teachers/[id]';
import TeacherCalendar from '../../app/(tabs)/more/teachers/calendar/[id]';
import TeachersIndex from '../../app/(tabs)/more/teachers/index';
import AllTeachers from '../../app/(tabs)/more/teachers/schedule';
import MakeupRoute from '../../app/(tabs)/students/makeup/[lessonId]';
import PaymentRoute from '../../app/(tabs)/students/payment/[id]';
import StudentRoute from '../../app/(tabs)/students/[id]';
import StudentsLayout from '../../app/(tabs)/students/_layout';
import StudentsIndex from '../../app/(tabs)/students/index';

/** The admin app's real route modules (the teacher tree stays out: the gate never opens it here). */
export const routes = {
  _layout: AppLayout,
  login: Login,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': Today,
  '(tabs)/schedule': Schedule,
  '(tabs)/inbox/_layout': InboxLayout,
  '(tabs)/inbox/index': InboxIndex,
  '(tabs)/inbox/[id]': LeadRoute,
  // The chat and what it opens: a full screen above the tabs (same URLs, the group adds no segment).
  '(admin-chat)/_layout': ChatLayout,
  '(admin-chat)/inbox/thread/[phone]': ThreadRoute,
  '(admin-chat)/inbox/book': BookRoute,
  '(admin-chat)/inbox/subscribe': SubscribeRoute,
  '(admin-chat)/inbox/sales-course': SalesCourseRoute,
  '(admin-chat)/inbox/sales-subscribe': SalesSubscribeRoute,
  '(admin-chat)/inbox/sales-transfer': SalesTransferRoute,
  '(tabs)/students/_layout': StudentsLayout,
  '(tabs)/students/index': StudentsIndex,
  '(tabs)/students/[id]': StudentRoute,
  '(tabs)/students/makeup/[lessonId]': MakeupRoute,
  '(tabs)/students/payment/[id]': PaymentRoute,
  '(tabs)/more/_layout': MoreLayout,
  '(tabs)/more/index': MoreIndex,
  '(tabs)/more/finance/payouts': FinancePayouts,
  '(tabs)/more/finance/expenses': FinanceExpenses,
  '(tabs)/more/finance/invoices': FinanceInvoices,
  '(tabs)/more/finance/summary': FinanceSummary,
  '(tabs)/more/teachers/index': TeachersIndex,
  '(tabs)/more/teachers/[id]': TeacherRoute,
  '(tabs)/more/teachers/calendar/[id]': TeacherCalendar,
  '(tabs)/more/teachers/schedule': AllTeachers,
};
