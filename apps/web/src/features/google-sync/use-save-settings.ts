import { useMutation, useQueryClient } from '@tanstack/react-query';
import { t } from '@/lib/i18n/i18n';
import { googleStatusQuery, putGoogleSettings } from './google-api';

/** PUT /admin/google/settings: the answer is the new status; the toast says «تم حفظ…». */
export function useSaveSettings(onNote: (message: string) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: putGoogleSettings,
    onSuccess: async (next) => {
      queryClient.setQueryData(googleStatusQuery.queryKey, next);
      onNote(t.googleSync.switches.saved);
      await queryClient.invalidateQueries({ queryKey: ['google', 'items'] });
    },
  });
}
