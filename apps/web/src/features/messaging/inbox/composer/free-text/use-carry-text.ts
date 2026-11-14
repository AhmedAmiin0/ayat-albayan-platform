import { messageTemplate } from '@ab/client-core';
import type { TemplateView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { templatesQuery } from '@/features/messaging/templates';
import {
  allowedTemplates,
  useReadsMessaging,
} from '@/features/messaging/inbox/composer/lib/allowed-templates';
import {
  draftGeneration,
  getDraft,
  keptFailed,
  setDraft,
  subscribeDrafts,
} from '@/features/messaging/inbox/composer/lib/draft-store';

export interface CarryText {
  /** The chat's unsent draft. */
  draft: string;
  /** academy_message when approved on the chat line and allowed for this user; else null. */
  template: TemplateView | null;
  /** Once the template went: the draft is cleared, never also held (a failure note stays). */
  clear: () => void;
}

/** «أرسِل الآن داخل قالب» (owner 2026-11-14): the draft and the template that carries it. */
export function useCarryText(phone: string, teacher: boolean): CarryText {
  const draft = useSyncExternalStore(subscribeDrafts, () => getDraft(phone).text);
  const templates = useQuery({ ...templatesQuery, enabled: useReadsMessaging() });
  const template = messageTemplate(allowedTemplates(templates.data, teacher));
  const gen = draftGeneration();
  const clear = () => setDraft(phone, { text: '', failed: keptFailed(getDraft(phone).failed) }, gen);
  return { draft, template, clear };
}
