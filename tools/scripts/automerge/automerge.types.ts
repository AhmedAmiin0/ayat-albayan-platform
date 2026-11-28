export type Action = 'merge' | 'update' | 'comment' | 'skip';

export interface Decision {
  action: Action;
  reason: string;
}
