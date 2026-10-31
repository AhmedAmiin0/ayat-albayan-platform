import { ParseUUIDPipe } from '@nestjs/common';

const UUID = new ParseUUIDPipe();

/**
 * The student and message ids of …/messages/:messageId routes, one @Param() object (max-params).
 */
export async function messageParams(
  params: Record<string, string | undefined>,
  studentKey: 'id' | 'studentId',
): Promise<{ studentId: string; messageId: string }> {
  const studentId = await UUID.transform(params[studentKey] ?? '', {
    type: 'param',
    data: studentKey,
  });
  const messageId = await UUID.transform(params.messageId ?? '', {
    type: 'param',
    data: 'messageId',
  });
  return { studentId, messageId };
}
