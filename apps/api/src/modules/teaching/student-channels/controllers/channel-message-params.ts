import { uuidOf } from '@/common/http/uuid-param';

/**
 * The student and message ids of …/messages/:messageId routes, one @Param() object (max-params).
 * A bad id is the 400 `validation_failed` envelope (docs/36 z2b), the student's checked first.
 */
export function messageParams(
  params: Record<string, string | undefined>,
  studentKey: 'id' | 'studentId',
): { studentId: string; messageId: string } {
  const studentId = uuidOf(studentKey, params[studentKey]);
  const messageId = uuidOf('messageId', params.messageId);
  return { studentId, messageId };
}
