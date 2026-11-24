import { CHANNEL_REFRESH_MS, TEACHER_CHANNELS_PATH } from '@ab/client-core';
import type { TeacherChannelRow } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { TEACHER_CHANNELS_KEY, useScreenFocused, apiFetch } from '@ab/mobile-kit';

// The teacher's student-message list polls while shown (docs/31 §2).

/** `enabled` false when not a teacher, so an admin's in-room chat reads no list. */
export function useTeacherChannels(enabled = true) {
  const focused = useScreenFocused();
  return useQuery({
    queryKey: TEACHER_CHANNELS_KEY,
    queryFn: () => apiFetch<TeacherChannelRow[]>(TEACHER_CHANNELS_PATH),
    refetchInterval: focused ? CHANNEL_REFRESH_MS : false,
    enabled,
  });
}
