import type { PortalFileInput } from '@ab/client-core';
import { useMutation } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { portalSend } from '#/portal/index.ts';

/**
 * A sent report's PDF or a visible recording: a fresh signed link (5 minutes / an hour) opened in
 * the phone's viewer or browser; `isError` when it could not be had.
 */
export function useOpenFile() {
  return useMutation({
    mutationFn: async (input: PortalFileInput) => {
      await Linking.openURL((await portalSend.fileUrl(input)).url);
    },
  });
}

/** A link the API already signed (the report page's PDF). */
export function useOpenUrl() {
  return useMutation({ mutationFn: (url: string) => Linking.openURL(url) });
}
