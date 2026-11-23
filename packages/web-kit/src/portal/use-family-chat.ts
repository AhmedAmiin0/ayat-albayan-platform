import { familyChatOn } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { publicConfigQuery } from '#/lib/settings/index.ts';

/**
 * settings.family_chat_enabled (docs/50 §2, public): the family's teacher chat exists only while it
 * is on. Off until GET /settings/public answers, and when it cannot be read (its default).
 */
export function useFamilyChatOn(): boolean {
  return familyChatOn(useQuery(publicConfigQuery).data);
}
