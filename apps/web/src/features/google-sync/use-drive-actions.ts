import type { GoogleStatusView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { t } from '@/lib/i18n';
import { discoverGoogle, googleStatusQuery, putGoogleDrive } from './google-api';

/** «ابحث في Google» and «تأكيد المجلد والجدول»: both answer the new status (teacher suggestions may change). */
export function useDriveActions(onNote: (message: string) => void) {
  const queryClient = useQueryClient();
  const onStatus = async (next: GoogleStatusView) => {
    queryClient.setQueryData(googleStatusQuery.queryKey, next);
    await queryClient.invalidateQueries({ queryKey: ['google', 'teachers'] });
  };
  const discover = useMutation({ mutationFn: discoverGoogle, onSuccess: onStatus });
  const confirm = useMutation({
    mutationFn: putGoogleDrive,
    onSuccess: async (next) => {
      await onStatus(next);
      onNote(t.googleSync.drive.saved);
    },
  });
  return { discover, confirm, failed: discover.isError || confirm.isError };
}
