import { type ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, type GestureResponderEvent, I18nManager, useWindowDimensions } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { cancelDistance, dragVerdict, hintOpacity, micShift, towardStart } from './voice-drag';
import type { VoiceUi } from './use-voice';

type Hold = Pick<VoiceUi, 'press' | 'release' | 'keep' | 'cancel' | 'lock' | 'recording' | 'drag' | 'hint'>;

/** A screen reader is on (live): its users get tap-to-record locked, never hold-and-slide. */
function useScreenReader(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isScreenReaderEnabled()
      .then((v) => live && setOn(v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setOn);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return on;
}

/**
 * Hold the microphone to record, lift to send (owner 2026-10-27, as WhatsApp): slide toward the
 * start (left in English, right in Arabic) past the line to cancel, slide up to lock. The responder
 * keeps the touch from the list's scroll and the swipe-to-reply (as Waveform). The system taking the
 * touch stops and keeps the recording. With a screen reader: a tap («activate») records locked.
 */
export function MicHold({ voice, children }: { voice: Hold; children: ReactNode }) {
  const { width } = useWindowDimensions();
  const reader = useScreenReader();
  const origin = useRef({ x: 0, y: 0 });
  const rtl = I18nManager.isRTL;
  const cancel = cancelDistance(width);

  const grant = (e: GestureResponderEvent) => {
    origin.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    void voice.press(false);
  };
  const move = (e: GestureResponderEvent) => {
    if (!voice.recording()) return;
    const dx = e.nativeEvent.pageX - origin.current.x;
    const dy = e.nativeEvent.pageY - origin.current.y;
    voice.drag.setValue(micShift(dx, rtl, cancel));
    voice.hint.setValue(hintOpacity(towardStart(dx, rtl), cancel));
    const verdict = dragVerdict({ dx, dy, rtl, width });
    if (verdict === 'cancel') void voice.cancel();
    if (verdict === 'lock') voice.lock();
  };
  const settle = () => {
    voice.drag.setValue(0);
    voice.hint.setValue(1);
  };

  return (
    <Animated.View
      accessible
      accessibilityRole="button"
      accessibilityLabel={t.inbox.composer.voice.record}
      accessibilityHint={t.inbox.composer.voice.hint}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={() => void voice.press(true)}
      onStartShouldSetResponder={() => !reader}
      onMoveShouldSetResponder={() => !reader}
      onResponderTerminationRequest={() => false}
      onResponderGrant={grant}
      onResponderMove={move}
      onResponderRelease={() => void voice.release()}
      onResponderTerminate={() => {
        settle();
        void voice.keep();
      }}
      style={{ transform: [{ translateX: voice.drag }] }}
    >
      {children}
    </Animated.View>
  );
}
