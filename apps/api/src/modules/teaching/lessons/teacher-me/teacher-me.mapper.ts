import { teacherMeSchema, type TeacherMe, type TeacherMeInput } from '@ab/schedule';
import { asResponse } from '@/common/http/returns';

/** GET /teachers/me through the strict answer schema: a row that does not fit is a 500. */
export const toTeacherMe = (me: TeacherMeInput): TeacherMe => asResponse(teacherMeSchema, me);
