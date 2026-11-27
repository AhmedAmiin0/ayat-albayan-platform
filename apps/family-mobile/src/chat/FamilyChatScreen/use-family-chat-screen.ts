import { useLocalSearchParams } from 'expo-router';
import { useDeviceChannelMedia } from '@ab/mobile-kit/channel/media';

export function useFamilyChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const refs = { audience: 'portal', studentId: id } as const;
  const media = useDeviceChannelMedia();
  return { refs, media };
}
