import * as Haptics from 'expo-haptics';

type Outcome = 'ok' | 'refused';

const KIND: Record<Outcome, Haptics.NotificationFeedbackType> = {
  ok: Haptics.NotificationFeedbackType.Success,
  refused: Haptics.NotificationFeedbackType.Error,
};

/**
 * The sign-in's haptic (docs/50 §5 «Response»): success when a code went out or the person is in,
 * error on a refusal. A phone without a vibrator (or a test) just stays silent.
 */
export function feel(refusal: string | null): void {
  void Haptics.notificationAsync(KIND[refusal === null ? 'ok' : 'refused']).catch(() => undefined);
}
