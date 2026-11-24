import { TeacherChannelScreen } from '@/student-file';
import { guardedTeacherRoute } from '@/teacher';

/** A full screen above the tabs so no bar covers the send button. */
export default guardedTeacherRoute('messages', TeacherChannelScreen);
