import type { ChannelAudience } from '@ab/client-core';
import { router, useLocalSearchParams } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { useStudentName } from '@/ops';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { Button } from '@/core/ui/primitives/Button';
import { ChannelThread } from './ChannelThread';

/**
 * A student channel screen: the teacher's thread (/teacher/more/messages/:studentId), the admin's
 * read-only view (/students/channel/:id) and the owning assistant's (/sales/students/channel/:id).
 */
export function ChannelScreen({ audience }: { audience: ChannelAudience }) {
  const params = useLocalSearchParams<{ id?: string; studentId?: string }>();
  const studentId = params.studentId ?? params.id ?? '';
  const name = useStudentName(studentId, audience === 'admin');
  const title = audience === 'teacher' ? t.studentChannel.title : t.studentChannel.monitorTitle;
  return (
    <Screen chat>
      <ScreenHeader title={title} subtitle={name} trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />} />
      <ChannelThread refs={{ audience, studentId }} />
    </Screen>
  );
}

export const TeacherChannelScreen = () => <ChannelScreen audience="teacher" />;
export const AdminChannelScreen = () => <ChannelScreen audience="admin" />;
export const SalesChannelScreen = () => <ChannelScreen audience="sales" />;
