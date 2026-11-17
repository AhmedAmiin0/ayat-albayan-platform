import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChannelRef } from '../channel-api';

// The viewer's read mark on this phone (the API's page does not say where she stopped reading):
// the newest message's time she marked read last, kept so the next opening shows «n غير مقروءة».

const keyOf = (ref: ChannelRef): string => `channel-read:${ref.audience}:${ref.studentId}`;

/** The last mark, or null (never opened here, or storage unavailable). */
export async function readMarkOf(ref: ChannelRef): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(keyOf(ref));
  } catch {
    return null;
  }
}

export async function rememberReadMark(ref: ChannelRef, at: string): Promise<void> {
  try {
    await AsyncStorage.setItem(keyOf(ref), at);
  } catch {
    // a phone without storage only loses the band
  }
}
