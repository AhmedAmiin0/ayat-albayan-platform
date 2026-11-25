import type { QueryKey } from '@tanstack/react-query';

const all = ['internal-meetings'] as const;

// A meeting write invalidates `all`, which reaches the list, the invitees and the options.
export const meetingKeys = {
  all,
  list: (): QueryKey => [...all, 'list'],
  public: (token: string): QueryKey => [...all, 'public', token],
  invitees: (meetingId: string): QueryKey => [...all, 'invitees', meetingId],
  inviteeOptions: (search: string): QueryKey => [...all, 'invitee-options', search],
};
