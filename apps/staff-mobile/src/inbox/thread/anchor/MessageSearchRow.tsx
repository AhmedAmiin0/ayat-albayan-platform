import { phoneE164 } from '@ab/core';
import { router, useLocalSearchParams } from 'expo-router';
import { t, Button } from '@ab/mobile-kit';
import { requestSearch } from './search-request';

/** docs/37 NEW 2: only when the header passed `?phone=`; nothing when opened elsewhere. */
export function MessageSearchRow() {
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  const chat = phoneE164.safeParse(phone);
  if (!chat.success) return null;
  const open = () => {
    requestSearch(chat.data);
    router.back();
  };
  return <Button variant="secondary" label={t.inbox.chatSearch.fromProfile} onPress={open} />;
}
