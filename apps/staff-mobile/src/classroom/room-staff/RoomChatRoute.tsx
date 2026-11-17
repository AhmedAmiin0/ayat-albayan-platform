import { useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { AdminChannelScreen, TeacherChannelScreen } from '@/student-file';

const audienceSchema = z.enum(['teacher', 'admin']).catch('teacher');

type Audience = z.infer<typeof audienceSchema>;

/**
 * Read at render, not at import: the student file reaches the room through @/teaching → @/today →
 * @/calendar, so at import time this module may see @/student-file half-loaded.
 */
const SCREENS: Record<Audience, () => ReactNode> = {
  teacher: () => <TeacherChannelScreen />,
  admin: () => <AdminChannelScreen />,
};

/**
 * app/room-chat/[studentId]: the student channel as a sheet over the live room (the room keeps
 * running beneath; its back returns to it). The same screen as «رسائل الطلاب», mounted as is.
 */
export function RoomChatRoute() {
  const params = useLocalSearchParams<{ audience?: string }>();
  return SCREENS[audienceSchema.parse(params.audience)]();
}
