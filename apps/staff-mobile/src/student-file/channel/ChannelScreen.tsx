import type { ChannelAudience } from '@ab/client-core';
import { useLocalSearchParams } from 'expo-router';
import { t, ChannelScreen } from '@ab/mobile-kit';

type StaffAudience = Extract<ChannelAudience, 'teacher' | 'admin'>;

/** The teacher's «رسائل الطلاب»; the chat between the teacher and the family for the admin. */
const TITLE: Readonly<Record<StaffAudience, 'title' | 'monitorTitle'>> = {
  teacher: 'title',
  admin: 'monitorTitle',
};

/**
 * A student channel screen (the shared kit's): the teacher's thread
 * (/teacher/more/messages/:studentId) and the admin's read-only view (/students/channel/:id). The
 * assistant's (/sales/students/channel/:id) reads her seat first: SalesChannelScreen.
 */
function StaffChannelScreen({ audience }: { audience: StaffAudience }) {
  const params = useLocalSearchParams<{ id?: string; studentId?: string }>();
  const studentId = params.studentId ?? params.id ?? '';
  const title = t.studentChannel[TITLE[audience]];
  return <ChannelScreen refs={{ audience, studentId }} title={title} />;
}

export const TeacherChannelScreen = () => <StaffChannelScreen audience="teacher" />;
export const AdminChannelScreen = () => <StaffChannelScreen audience="admin" />;
