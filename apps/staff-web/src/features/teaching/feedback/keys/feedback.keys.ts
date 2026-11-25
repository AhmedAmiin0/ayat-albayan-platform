import type { QueryKey } from '@tanstack/react-query';

const all = ['feedback'] as const;

export const feedbackKeys = {
  all,
  public: (token: string): QueryKey => [...all, 'public', token],
  list: (state: unknown): QueryKey => [...all, 'list', state],
  summary: (): QueryKey => [...all, 'summary'],
  mine: (state: unknown): QueryKey => [...all, 'mine', state],
};
