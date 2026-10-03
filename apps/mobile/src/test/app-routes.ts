import AppLayout from '../../app/_layout';
import TabsLayout from '../../app/(tabs)/_layout';
import Today from '../../app/(tabs)/index';
import Schedule from '../../app/(tabs)/schedule';
import LeadRoute from '../../app/(tabs)/inbox/[id]';
import InboxLayout from '../../app/(tabs)/inbox/_layout';
import BookRoute from '../../app/(tabs)/inbox/book';
import InboxIndex from '../../app/(tabs)/inbox/index';
import SubscribeRoute from '../../app/(tabs)/inbox/subscribe';
import ThreadRoute from '../../app/(tabs)/inbox/thread/[phone]';
import Login from '../../app/login';
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
  '(tabs)/inbox/book': BookRoute,
  '(tabs)/inbox/subscribe': SubscribeRoute,
  '(tabs)/inbox/thread/[phone]': ThreadRoute,
  '(tabs)/students/_layout': StudentsLayout,
  '(tabs)/students/index': StudentsIndex,
  '(tabs)/students/[id]': StudentRoute,
  '(tabs)/students/makeup/[lessonId]': MakeupRoute,
  '(tabs)/students/payment/[id]': PaymentRoute,
  '(tabs)/more/_layout': MoreLayout,
  '(tabs)/more/index': MoreIndex,
  '(tabs)/more/teachers/index': TeachersIndex,
  '(tabs)/more/teachers/[id]': TeacherRoute,
  '(tabs)/more/teachers/calendar/[id]': TeacherCalendar,
  '(tabs)/more/teachers/schedule': AllTeachers,
};
