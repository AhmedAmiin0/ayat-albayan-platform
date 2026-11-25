import { useMutation, useQueryClient } from '@tanstack/react-query';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { googleStatusQuery, putGoogleSettings } from './google-api';
import { googleKeys } from '@/features/platform/keys';

export function useSaveSettings(onNote: (message: string) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: putGoogleSettings,
    onSuccess: async (next) => {
      queryClient.setQueryData(googleStatusQuery.queryKey, next);
      onNote(t.googleSync.switches.saved);
      await queryClient.invalidateQueries({ queryKey: googleKeys.items() });
    },
  });
}
