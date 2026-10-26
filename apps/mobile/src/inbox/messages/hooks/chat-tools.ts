import { Linking } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { fetchDownload } from './thread-file';

// «نسخ» and «تنزيل» in a chat (owner 2026-10-26), in one place: the installed APK has no clipboard,
// sharing or media-library module, so this file is the only one a later build swaps.

/** What «نسخ النص» / «نسخ الرقم» shows: the sheet's title and the exact text. */
export interface CopyRequest {
  title: string;
  text: string;
}

/** Copies by showing the text in a selectable sheet (CopySheet): the OS selection copies all or part. */
export function copyText(req: CopyRequest, show: (req: CopyRequest) => void): void {
  show(req);
}

/** Hands the signed URL to the phone's browser, which saves or opens it (Content-Disposition: its name). */
export async function saveFile(url: string): Promise<void> {
  await Linking.openURL(url);
}

/** A fresh signed URL of the bubble's file (the same role rules as opening it), then saveFile. */
export async function downloadFile(input: { phone: string; messageId: string }): Promise<void> {
  const file = await fetchDownload(input.phone, input.messageId);
  await saveFile(file.url);
}

/** Why a download failed, as MessageFile says it: 403 «غير مسموح», 410 gone, else try again. */
export function downloadProblem(e: unknown): string {
  if (e instanceof ApiError && e.status === 403) return t.inbox.mediaNotAllowed;
  if (e instanceof ApiError && e.status === 410) return t.inbox.mediaExpired;
  return t.inbox.download.failed;
}
