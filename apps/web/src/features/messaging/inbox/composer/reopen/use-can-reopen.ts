import { reopenChoices } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { templatesQuery } from '@/features/messaging/templates';
import {
  allowedTemplates,
  useReadsMessaging,
} from '@/features/messaging/inbox/composer/lib/allowed-templates';

/**
 * May this user reopen the chat: a chat-line template on their list (the picker's list, so the
 * button never opens an empty dialog). Until the list loads: yes (the dialog shows its loading).
 */
export function useCanReopen(teacher: boolean): boolean {
  const templates = useQuery({ ...templatesQuery, enabled: useReadsMessaging() });
  const allowed = allowedTemplates(templates.data, teacher);
  return !templates.isSuccess || reopenChoices(allowed, undefined).list.length > 0;
}
