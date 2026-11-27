import { CHANNEL_REFRESH_MS, teacherChannelCalls } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { TEACHER_CHANNELS_KEY, useScreenFocused, apiFetch, apiSend } from '@ab/mobile-kit';

const teacherChannels = teacherChannelCalls({ apiFetch, apiSend });

// The teacher's student-message list polls while shown (docs/31 §2).

/** `enabled` false when not a teacher, so an admin's in-room chat reads no list. */
export function useTeacherChannels(enabled = true) {
  const focused = useScreenFocused();
  return useQuery({
    queryKey: TEACHER_CHANNELS_KEY,
    queryFn: teacherChannels.list,
    refetchInterval: focused ? CHANNEL_REFRESH_MS : false,
    enabled,
  });
}
