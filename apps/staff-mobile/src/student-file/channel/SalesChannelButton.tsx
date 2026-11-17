import { router } from 'expo-router';
import { t, Button } from '@ab/mobile-kit';
import { useStudentHref } from '@/core/nav/tree-base';

/**
 * «تفاصيل الطالب»'s way into the student's chat (owner 2026-11-16): the chat if she holds its
 * seat, else the seat card (SalesChannelScreen).
 */
export function SalesChannelButton({ studentId }: { studentId: string }) {
  const to = useStudentHref();
  return (
    <Button
      variant="secondary"
      label={t.studentChannel.monitorTitle}
      onPress={() => router.push(to(`/sales/students/channel/${studentId}`))}
    />
  );
}
