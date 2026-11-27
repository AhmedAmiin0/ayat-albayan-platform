export interface RetryButtonProps {
  label: string;
  onPress: () => void;
  /**
   * Before Noto Sans Arabic is registered the system Arabic font (an unknown family is an error
   * on iOS).
   */
  fontFamily: string | undefined;
}
