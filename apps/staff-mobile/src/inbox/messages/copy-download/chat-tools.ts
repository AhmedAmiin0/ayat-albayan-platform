import { Linking } from 'react-native';
import { ApiError, t } from '@ab/mobile-kit';
import { fetchDownload } from '@/inbox/messages/hooks/thread-file';

// The installed APK has no sharing or media-library module, so only this file changes later.

export interface CopyRequest {
  title: string;
  text: string;
}

/** Shows the text in a selectable sheet (CopySheet): the OS selection copies all or part. */
export function copyText(req: CopyRequest, show: (req: CopyRequest) => void): void {
  show(req);
}

/** The phone's browser saves or opens the signed URL (Content-Disposition gives its name). */
async function saveFile(url: string): Promise<void> {
  await Linking.openURL(url);
}

/** A fresh signed URL of the bubble's file (the same role rules as opening it), then saveFile. */
export async function downloadFile(input: { phone: string; messageId: string }): Promise<void> {
  const file = await fetchDownload(input.phone, input.messageId);
  await saveFile(file.url);
}

/** 403 is not allowed, 410 is gone, anything else asks to try again. */
export function downloadProblem(e: unknown): string {
  if (e instanceof ApiError && e.status === 403) return t.inbox.mediaNotAllowed;
  if (e instanceof ApiError && e.status === 410) return t.inbox.mediaExpired;
  return t.inbox.download.failed;
}
