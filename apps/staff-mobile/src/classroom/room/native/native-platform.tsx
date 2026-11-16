import type { ComponentProps } from 'react';
import type { RoomPlatform } from '@/classroom/room/model/room-types';
import { deviceMemory } from './device-memory';
import { liveKitNative, type LiveKitNative } from './livekit-native';
import { nativeAudio } from './native-audio';
import { createNativeClient } from './native-client';
import { askCamMic, checkCamMic, openPreview } from './native-media';

type TrackRef = ComponentProps<LiveKitNative['sdk']['VideoTrack']>['trackRef'];

const fill = { flex: 1 } as const;

/**
 * The real platform of the room screen, or null on a binary without LiveKit (the room then opens
 * the web).
 */
export function nativeRoomPlatform(): RoomPlatform | null {
  const n = liveKitNative();
  if (!n) return null;
  const { VideoTrack } = n.sdk;
  const { RTCView } = n.rtc;
  return {
    createClient: () => createNativeClient(n),
    // The tile's video is the TrackReference built in native-store.ts; a screen is never cropped.
    Video: ({ video, mirror, fit }) => (
      <VideoTrack trackRef={video as TrackRef} mirror={mirror} objectFit={fit} style={fill} />
    ),
    PreviewVideo: ({ streamUrl }) => (
      <RTCView streamURL={streamUrl} mirror objectFit="cover" style={fill} />
    ),
    openPreview: () => openPreview(n),
    media: { check: checkCamMic, ask: askCamMic },
    audio: nativeAudio(n),
    devices: deviceMemory,
  };
}
