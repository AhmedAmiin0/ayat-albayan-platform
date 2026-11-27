import { useMutation } from '@tanstack/react-query';
import { portalApi } from '@ab/web-kit/portal/api';
import { openAfter } from '@ab/web-kit/portal/open-file';
import type { PortalFile, Props } from './FileButtons.types';

export function useFileButtons({ studentId }: Pick<Props, 'studentId'>) {
  const open = useMutation({
    mutationFn: (file: PortalFile) =>
      openAfter(async () => (await portalApi.fileUrl({ studentId, ...file })).url),
  });
  return { open };
}
