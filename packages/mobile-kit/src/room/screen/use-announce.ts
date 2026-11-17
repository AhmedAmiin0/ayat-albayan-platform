import { useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * iOS VoiceOver does not read a live region that appears: the room's step line is announced once
 * it shows (Android reads the polite live region by itself).
 */
export function useAnnounce(message: string) {
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
}
