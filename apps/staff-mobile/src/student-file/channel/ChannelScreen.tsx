import type { ChannelAudience } from '@ab/client-core';
import { useLocalSearchParams } from 'expo-router';
import { t, ChannelScreen } from '@ab/mobile-kit';

type StaffAudience = Exclude<ChannelAudience, 'portal'>;

/** The teacher writes in «رسائل الطلاب»; the admin and the owning assistant monitor. */
const TITLE: Readonly<Record<StaffAudience, 'title' | 'monitorTitle'>> = {
  teacher: 'title',
  admin: 'monitorTitle',
  sales: 'monitorTitle',
};

/**
 * A student channel screen (the shared kit's): the teacher's thread
 * (/teacher/more/messages/:studentId), the admin's read-only view (/students/channel/:id) and the
 * owning assistant's (/sales/students/channel/:id).
 */
function StaffChannelScreen({ audience }: { audience: StaffAudience }) {
  const params = useLocalSearchParams<{ id?: string; studentId?: string }>();
  const studentId = params.studentId ?? params.id ?? '';
  const title = t.studentChannel[TITLE[audience]];
  return <ChannelScreen refs={{ audience, studentId }} title={title} />;
}

export const TeacherChannelScreen = () => <StaffChannelScreen audience="teacher" />;
export const AdminChannelScreen = () => <StaffChannelScreen audience="admin" />;
export const SalesChannelScreen = () => <StaffChannelScreen audience="sales" />;
