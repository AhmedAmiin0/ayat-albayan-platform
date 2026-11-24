import { queryOptions, useQuery } from '@tanstack/react-query';
import { nativeRoomKeys } from './native-room.keys';
import { nativeRoomPlatform } from './native-platform';

/**
 * The device's room platform, or null on a binary without LiveKit. Loaded once per app run (the
 * binary cannot change under it) and never saved to disk: it holds functions and components.
 */
export const nativeRoomQuery = queryOptions({
  queryKey: nativeRoomKeys.platform(),
  queryFn: nativeRoomPlatform,
  staleTime: Infinity,
  gcTime: Infinity,
  retry: false,
  networkMode: 'always',
  structuralSharing: false,
  meta: { noPersist: true },
});

/** Pending while LiveKit loads: the room shows its connecting state, never «not supported». */
export const useNativeRoom = () => useQuery(nativeRoomQuery);
