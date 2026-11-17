import { TeacherChannelScreen } from '@/student-file';
import { guardedTeacherRoute } from '@/teacher';

/** One student's chat with the family: a full screen above her tabs (no bar over «أرسل»). */
export default guardedTeacherRoute('messages', TeacherChannelScreen);
