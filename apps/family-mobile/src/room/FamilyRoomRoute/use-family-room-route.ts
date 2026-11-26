import { useLocalSearchParams } from 'expo-router';
import { parseRoomParams } from '@/room/room-way';

export function useFamilyRoomRoute() {
  return { link: parseRoomParams(useLocalSearchParams()) };
}
