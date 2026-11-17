import type { ChannelAudience } from '@ab/client-core';
import { useLocalSearchParams } from 'expo-router';
import { t, ChannelScreen } from '@ab/mobile-kit';
import { useStaffChannelMedia } from './use-staff-channel-media';

type StaffAudience = Exclude<ChannelAudience, 'portal'>;

/** The teacher's chat is titled by the student; the others see whose chat it is first. */
const TITLE: Readonly<Record<StaffAudience, 'monitorTitle' | null>> = {
  teacher: null,
  admin: 'monitorTitle',
  sales: 'monitorTitle',
};

/**
 * A student channel screen (the shared kit's): the teacher's thread
 * (/teacher/more/messages/:studentId), the admin's read-only view (/students/channel/:id) and the
 * owning assistant's (/sales/students/channel/:id), where she writes too (owner 2026-11-16). The
 * staff phone gives the chat its pickers, microphone and player.
 */
function StaffChannelScreen({ audience }: { audience: StaffAudience }) {
  const params = useLocalSearchParams<{ id?: string; studentId?: string }>();
  const studentId = params.studentId ?? params.id ?? '';
  const key = TITLE[audience];
  const media = useStaffChannelMedia();
  return (
    <ChannelScreen
      refs={{ audience, studentId }}
      title={key ? t.studentChannel[key] : undefined}
      media={media}
    />
  );
}

export const TeacherChannelScreen = () => <StaffChannelScreen audience="teacher" />;
export const AdminChannelScreen = () => <StaffChannelScreen audience="admin" />;
export const SalesChannelScreen = () => <StaffChannelScreen audience="sales" />;
