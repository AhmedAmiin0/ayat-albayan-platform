import { roomModerationApi, type RoomModerationApi } from '@ab/client-core';
import { queryOptions, useQuery, type QueryClient } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';
import { recordingsPath, type RecordingSource } from './recording-format';

const api = roomModerationApi({ apiFetch, apiSend });

const RECORDINGS: Record<RecordingSource['kind'], RoomModerationApi['lessonRecordings']> = {
  lesson: api.lessonRecordings,
  meeting: api.meetingRecordings,
};

// The list carries 1-hour signed URLs, so `noPersist` keeps it off the disk cache (lib/query-client).
const meta = { noPersist: true };

const recordingsQuery = (source: RecordingSource) =>
  queryOptions({
    queryKey: pathKey(recordingsPath(source)),
    queryFn: () => RECORDINGS[source.kind](source.id),
    meta,
  });

export const useRecordings = (source: RecordingSource) => useQuery(recordingsQuery(source));

/** GET /recordings/status: can the server record at all? Unknown while it loads or fails: no warning. */
export function useRecordingStatus() {
  return useQuery({
    queryKey: pathKey('/recordings/status'),
    queryFn: () => api.recordingStatus(),
  });
}

/** The recording has no (valid) link any more: finished files only, links last an hour. */
class RecordingUnavailable extends Error {}

/**
 * Play = ask for a fresh list at the moment of the tap (a link seen minutes ago may have expired),
 * take this recording's URL and hand it to the system browser/player. The URL is never stored.
 */
export async function playRecording(
  client: QueryClient,
  source: RecordingSource,
  id: string,
): Promise<void> {
  const list = await client.fetchQuery({ ...recordingsQuery(source), staleTime: 0 });
  const url = list.find((r) => r.id === id)?.url;
  if (!url) throw new RecordingUnavailable();
  await Linking.openURL(url);
}
