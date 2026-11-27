import { useNativeRoom, type BackSource } from '@ab/mobile-kit/room';
import { useNavigation } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { useChildLessons } from '@/portal';
import { back } from '@/room/FamilyRoomRoute/family-room-route.helpers';
import { useFamilyRoomChat } from '@/room/use-family-room-chat';
import type { FamilyRoomProps } from './FamilyRoom.types';
import { joinFor, openInBrowser } from './family-room.helpers';

export function useFamilyRoom({ link }: FamilyRoomProps) {
  const native = useNativeRoom();
  const chat = useFamilyRoomChat(link.studentId);
  const lessons = useChildLessons(link.studentId).data?.lessons ?? [];
  const navigation = useNavigation();
  const backSource: BackSource = (listener) => navigation.addListener('beforeRemove', listener);
  const browser = openInBrowser(link);
  return {
    native,
    chat,
    /** Who the lesson says is inside (its `room.inRoom`), from the child's lessons read. */
    presence: lessons.find((l) => l.id === link.lessonId)?.room?.inRoom ?? [],
    backSource,
    fetchJoin: joinFor(link),
    onBrowser: () => void browser(),
    again: { label: t.mobileRoom.openInBrowser, onPress: () => void browser().then(back) },
  };
}
