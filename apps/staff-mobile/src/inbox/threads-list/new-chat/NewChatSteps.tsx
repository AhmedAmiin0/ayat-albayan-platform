import { router } from 'expo-router';
import { useState } from 'react';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { threadHref } from '@/inbox/thread/hooks/thread-cache';
import { PhoneStep } from './PhoneStep';
import { TemplateStep } from './TemplateStep';
import type { FoundNumber } from './use-new-chat';

/** The server routes the line; an existing chat just opens; unmounting forgets every step. */
export function NewChatSteps({ onClose }: { onClose: () => void }) {
  const base = useTreeBase();
  const [value, setValue] = useState('');
  const [found, setFound] = useState<FoundNumber | null>(null);
  const openChat = (phone: string) => {
    onClose();
    router.push(inTree(base, threadHref(phone)));
  };
  const route: Record<FoundNumber['kind'], (number: FoundNumber) => void> = {
    new: setFound,
    existing: (number) => openChat(number.phone),
  };
  return found ? (
    <TemplateStep
      found={found}
      onBack={() => setFound(null)}
      onClose={onClose}
      onSent={() => openChat(found.phone)}
    />
  ) : (
    <PhoneStep
      value={value}
      onChange={setValue}
      onFound={(number) => route[number.kind](number)}
      onClose={onClose}
    />
  );
}
