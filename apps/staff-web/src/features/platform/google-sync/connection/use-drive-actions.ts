import type { GoogleStatusView } from '@ab/catalog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { t } from '@ab/web-kit';
import {
  discoverGoogle,
  googleStatusQuery,
  putGoogleDrive,
} from '@/features/platform/google-sync/google-api';
import { googleKeys } from '@/features/platform/keys';

/** Both return the new status, since teacher and student suggestions may change. */
export function useDriveActions(onNote: (message: string) => void) {
  const queryClient = useQueryClient();
  const onStatus = async (next: GoogleStatusView) => {
    queryClient.setQueryData(googleStatusQuery.queryKey, next);
    // Discovery feeds both suggestion lists: teachers (calendars) and students (summary sheet links).
    await Promise.all(
      [googleKeys.teachers(), googleKeys.students()].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
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
