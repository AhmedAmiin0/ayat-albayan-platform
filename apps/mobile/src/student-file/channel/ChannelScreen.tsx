import type { ChannelAudience } from '@ab/client-core';
import { router, useLocalSearchParams } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { Button } from '@/core/ui/primitives/Button';
import { ChannelPresenceLine } from './ChannelPresenceLine';
import { ChannelThread } from './ChannelThread';
import { useChannel } from './channel-queries';

/**
 * A student channel screen: the teacher's thread (/teacher/more/messages/:studentId), the admin's
 * read-only view (/students/channel/:id) and the owning assistant's (/sales/students/channel/:id).
 */
function ChannelScreen({ audience }: { audience: ChannelAudience }) {
  const params = useLocalSearchParams<{ id?: string; studentId?: string }>();
  const studentId = params.studentId ?? params.id ?? '';
  // The same query the thread reads (one request): it names the student.
  const name = useChannel({ audience, studentId }).data?.pages[0]?.student_name || undefined;
  const title = audience === 'teacher' ? t.studentChannel.title : t.studentChannel.monitorTitle;
  return (
    <Screen chat>
      <ScreenHeader title={title} subtitle={name} trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />} />
      <ChannelPresenceLine refs={{ audience, studentId }} />
      <ChannelThread refs={{ audience, studentId }} />
    </Screen>
  );
}

export const TeacherChannelScreen = () => <ChannelScreen audience="teacher" />;
export const AdminChannelScreen = () => <ChannelScreen audience="admin" />;
export const SalesChannelScreen = () => <ChannelScreen audience="sales" />;
