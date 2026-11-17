import { CHANNEL_REFRESH_MS, TEACHER_CHANNELS_PATH } from '@ab/client-core';
import type { TeacherChannelRow } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { TEACHER_CHANNELS_KEY, useScreenFocused, apiFetch } from '@ab/mobile-kit';

// «رسائل الطلاب» (docs/31 §2): the teacher's list polls while shown (CHANNEL_REFRESH_MS). The
// thread itself is the shared kit's (@ab/mobile-kit ChannelScreen).

/** `enabled` false: not a teacher (the in-room «المحادثة» of an admin reads no list). */
export function useTeacherChannels(enabled = true) {
  const focused = useScreenFocused();
  return useQuery({
    queryKey: TEACHER_CHANNELS_KEY,
    queryFn: () => apiFetch<TeacherChannelRow[]>(TEACHER_CHANNELS_PATH),
    refetchInterval: focused ? CHANNEL_REFRESH_MS : false,
    enabled,
  });
}
