export interface JoinButtonProps {
  onPress: () => void;
  busy: boolean;
  short?: boolean;
  live?: boolean;
}

export interface JoinLook {
  short: boolean;
  busy: boolean;
  /** The pill's fill colour. */
  fill: string;
}
