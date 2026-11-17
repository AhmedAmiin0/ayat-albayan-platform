import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import type { DeviceMemory, MediaWish } from '../model/room-types';

// «نحفظ اختيارك هذا، فتدخل مباشرة في المرات القادمة» (canvas RoomXPreview): the microphone and
// camera choice of the first preview, on this phone. Unreadable storage = no choice yet (the
// preview shows again); a failed save only shows it again next time.

const KEY = 'ab.room.devices';
const wishSchema = z.object({ mic: z.boolean(), cam: z.boolean() });

const decodeJson: (text: string) => unknown = JSON.parse;

const parse = (raw: string | null): MediaWish | null => {
  try {
    return wishSchema.nullable().catch(null).parse(decodeJson(raw ?? 'null'));
  } catch {
    return null;
  }
};

export const deviceMemory: DeviceMemory = {
  load: () => AsyncStorage.getItem(KEY).then(parse, () => null),
  save: (wish) => AsyncStorage.setItem(KEY, JSON.stringify(wish)).catch(() => undefined),
};
