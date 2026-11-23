export type Action = 'merge' | 'comment' | 'skip';

export interface Decision {
  action: Action;
  reason: string;
}
