import { chatFileProblem, type MessageView, type SignedUpload } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { apiSend } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { supabase } from '@/core/lib/http/supabase';
import { pickReceipt } from '@/payments/receipt';
import { sendError } from '../message-text';
import { appendMessage, removeMessage, type ThreadCache, threadKey, threadPath } from '../thread/hooks/thread-cache';

// The assistant sends a photo or a PDF from the chat (owner 2026-10-19 #1/#2), inside the 24 h
// window: the API signs an upload into wa-media, then queues the file as her message.

/** A picked file, its bytes ready for the signed upload. */
export interface ChatFilePick {
  mime: string;
  /** An ArrayBuffer: React Native uploads it reliably, a Blob it does not (payments/receipt.ts). */
  bytes: ArrayBuffer;
  size: number;
  /** The name the family sees on a PDF (1–200, no slashes). */
  filename: string;
}

export type ChatFileSource = 'image' | 'pdf';

/** A refusal before or during the upload, as inbox.error.<code>. */
export class ChatFileError extends Error {
  constructor(readonly code: 'file_type' | 'file_too_large' | 'file_upload') {
    super(code);
  }
}

/** The picked PDF's own name, made safe for the API (no path separators or control characters, ≤ 200). */
export function pdfName(name: string | undefined): string {
  const clean = (name ?? '').replace(/[/\\\p{Cc}]/gu, '_').trim().slice(0, 200).trim();
  return clean || 'file.pdf';
}

async function pickPdf(maxBytes: number): Promise<ChatFilePick | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  // Refused before the read: a 100 MB scan would otherwise sit in memory only to be refused.
  const early = asset.size === undefined ? null : chatFileProblem({ mime: asset.mimeType ?? 'application/pdf', size: asset.size, maxBytes });
  if (early) throw new ChatFileError(early);
  // The cached copy (copyToCacheDirectory) read through fetch: no file-system module in the APK.
  const bytes = await (await fetch(asset.uri)).arrayBuffer();
  return { mime: asset.mimeType ?? 'application/pdf', bytes, size: bytes.byteLength, filename: pdfName(asset.name) };
}

/** A photo from the gallery (compressed JPEG, no EXIF, as a receipt) or a PDF; null when cancelled. A PDF over maxBytes throws before it is read. */
export async function pickChatFile(source: ChatFileSource, maxBytes: number): Promise<ChatFilePick | null> {
  if (source === 'pdf') return pickPdf(maxBytes);
  const photo = await pickReceipt('library');
  if (!photo) return null;
  const ext = photo.mime === 'image/png' ? 'png' : 'jpg';
  return { mime: photo.mime, bytes: photo.bytes, size: photo.size, filename: `photo.${ext}` };
}

export interface SendFileInput {
  phone: string;
  file: ChatFilePick;
  /** The clientRequestId: one per picked file (rule 8: a replay returns the first row). */
  id: string;
  /** The academy's upload limit (useUploadMaxBytes); an image also stays within Meta's 5 MB. */
  maxBytes: number;
  /** The message it answers (owner 2026-10-25 «رد»): our row of the same chat. */
  replyToMessageId?: string;
}

/**
 * Checked here first (chatFileProblem, as the API does), then POST …/file-upload-url, the signed
 * upload (as assistants/upload-receipt.ts) and POST …/file with no caption. Resolves the API's row.
 */
export async function sendChatFile({ phone, file, id, maxBytes, replyToMessageId }: SendFileInput): Promise<MessageView> {
  const problem = chatFileProblem({ mime: file.mime, size: file.size, maxBytes });
  if (problem) throw new ChatFileError(problem);
  const signed = await apiSend<SignedUpload>('POST', `${threadPath(phone)}/file-upload-url`, {
    clientRequestId: id,
    mime: file.mime,
    size: file.size,
  });
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, file.bytes, { contentType: file.mime });
  if (error) throw new ChatFileError('file_upload');
  return apiSend<MessageView>('POST', `${threadPath(phone)}/file`, {
    clientRequestId: id,
    path: signed.path,
    filename: file.filename,
    ...(replyToMessageId ? { replyToMessageId } : {}),
  });
}

/** sendChatFile as a mutation: the API's row joins the thread at once, then it refetches (a text send). */
export function useSendFile(phone: string) {
  const client = useQueryClient();
  const queryKey = threadKey(phone);
  return useMutation({
    mutationFn: sendChatFile,
    onSuccess: (row) =>
      client.setQueryData<ThreadCache>(queryKey, (old) => appendMessage(removeMessage(old, row.id), row)),
    onSettled: () => client.invalidateQueries({ queryKey }),
  });
}

/** inbox.error.<code> for a refused file, as sendError does for the API's codes. */
export function fileError(error: unknown): string {
  return error instanceof ChatFileError ? t.inbox.error[error.code] : sendError(error);
}
