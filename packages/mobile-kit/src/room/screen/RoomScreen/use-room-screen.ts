import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useElapsed } from '../use-elapsed';
import { useRoomFlow } from '../use-room-flow';
import type { RoomScreenProps } from './RoomScreen.types';

export function useRoomScreen(props: RoomScreenProps) {
  const insets = useSafeAreaInsets();
  const screen = useRoomFlow(props);
  const { session } = screen;
  const elapsed = useElapsed(screen.live ? session.joinedAt : null);
  const live = {
    people: screen.panel.people,
    openPeople: () => screen.openSheet('people'),
    recording: session.snap.recording,
    elapsed,
  };
  return { insets, screen, live };
}
