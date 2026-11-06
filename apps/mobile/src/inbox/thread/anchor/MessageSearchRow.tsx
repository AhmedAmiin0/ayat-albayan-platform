import { phoneE164 } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { requestSearch } from './search-request';

/**
 * «بحث في الرسائل» on the student's details opened from a chat (docs/37 NEW 2: the header passes
 * `?phone=`): back to that chat with its search bar open. Nothing when opened from elsewhere.
 */
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
