export interface PresenceLabelProps {
  /** An empty string renders nothing. */
  text: string;
  /** Online now: a small success-toned dot before the words (never colour alone). */
  online?: boolean;
  testID?: string;
}
