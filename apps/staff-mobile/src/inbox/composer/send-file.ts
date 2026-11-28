import { CHAT_FILE_MIMES, chatFileProblem, type MessageView } from '@ab/shared';
import { chatFileCalls } from '@ab/client-core';
import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { apiFetch, apiSend, t } from '@ab/mobile-kit';
import { uploadSigned } from '@/core/lib/http/upload-slot';
import { markOwnSend } from '@/inbox/thread/anchor/own-send';
import { ensureCameraPermission, pickReceipt } from '@/payments';
import { sendError } from '@/inbox/messages/hooks/message-text';
import { touchInbox } from '@/inbox/thread/hooks/inbox-sync';
import { refreshSent } from '@/inbox/thread/hooks/use-thread';
import { appendMessage, removeMessage, type ThreadCache, threadKey } from '@/inbox/thread/hooks/thread-cache';

// The assistant sends a photo or a PDF from the chat, inside the 24 h
// window: the API signs an upload into wa-media, then queues the file as her message.

const chatFiles = chatFileCalls({ apiFetch, apiSend });

/** A picked file, its bytes ready for the signed upload. */
export interface ChatFilePick {
  mime: string;
  /** An ArrayBuffer: React Native uploads it reliably, a Blob it does not (payments/receipt.ts). */
  bytes: ArrayBuffer;
  size: number;
  /** The name the family sees on a PDF (1–200, no slashes). */
  filename: string;
}

/** The gallery, the camera (the pill's camera) or a PDF. */
export type ChatFileSource = 'image' | 'camera' | 'pdf';

/** A refusal before or during the upload, as inbox.error.<code>. */
export class ChatFileError extends Error {
  readonly code: 'file_type' | 'file_too_large' | 'file_upload';
  constructor(code: ChatFileError['code']) {
    super(code);
    this.code = code;
  }
}

/**
 * The picked PDF's own name, made safe for the API: no path separators or control characters,
 * at most 200 characters.
 */
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

/**
 * A photo from the gallery or the camera (compressed JPEG, no EXIF, as a receipt; the camera asks
 * its permission first) or a PDF; null when cancelled. A PDF over maxBytes throws before it
 * is read.
 */
export async function pickChatFile(
  source: ChatFileSource,
  maxBytes: number,
): Promise<ChatFilePick | null> {
  if (source === 'pdf') return pickPdf(maxBytes);
  // The chat's own reason first (not the receipt's); pickReceipt then finds the camera allowed.
  const copy = { rationale: t.inbox.composer.cameraRationale, confirm: t.inbox.composer.takePhoto };
  if (source === 'camera' && !(await ensureCameraPermission(copy))) return null;
  const photo = await pickReceipt(source === 'camera' ? 'camera' : 'library');
  if (!photo) return null;
  const ext = photo.mime === 'image/png' ? 'png' : 'jpg';
  return { mime: photo.mime, bytes: photo.bytes, size: photo.size, filename: `photo.${ext}` };
}

interface SendFileInput {
  phone: string;
  file: ChatFilePick;
  /** The clientRequestId: one per picked file (rule 8: a replay returns the first row). */
  id: string;
  /** The academy's upload limit (useUploadMaxBytes); an image also stays within Meta's 5 MB. */
  maxBytes: number;
  /** The answered message must be our row of the same chat. */
  replyToMessageId?: string;
}

/**
 * Checked here first (chatFileProblem, as the API does), then POST …/file-upload-url, the signed
 * upload (as assistants/upload-receipt.ts) and POST …/file with no caption. Resolves the API's row.
 */
export async function sendChatFile({
  phone,
  file,
  id,
  maxBytes,
  replyToMessageId,
}: SendFileInput): Promise<MessageView> {
  const problem = chatFileProblem({ mime: file.mime, size: file.size, maxBytes }, CHAT_FILE_MIMES);
  const mime = CHAT_FILE_MIMES.find((m) => m === file.mime);
  if (problem || !mime) throw new ChatFileError(problem ?? 'file_type');
  const params = { phone };
  const upload = { clientRequestId: id, mime, size: file.size };
  const signed = await chatFiles.uploadUrl({ params, body: upload });
  const { error } = await uploadSigned(signed, { body: file.bytes, contentType: file.mime });
  if (error) throw new ChatFileError('file_upload');
  const reply = replyToMessageId ? { replyToMessageId } : {};
  const body = { clientRequestId: id, path: signed.path, filename: file.filename, ...reply };
  return chatFiles.send({ params, body });
}

/**
 * sendChatFile as a mutation: the API's row joins the thread at once, then it refetches (a
 * text send).
 */
export function useSendFile(phone: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: sendChatFile, ...fileSendSteps(client, phone) });
}

/**
 * A chat file send's cache steps (this chat's file, a saved reply's file): a send from this device
 * (an anchored window goes live, docs/37), the API's row in the thread, then the refetch.
 */
export function fileSendSteps(client: QueryClient, phone: string) {
  const add = (row: MessageView) => (old: ThreadCache | undefined) =>
    appendMessage(removeMessage(old, row.id), row);
  return {
    onMutate: () => markOwnSend(phone),
    onSuccess: async (row: MessageView) => {
      client.setQueryData<ThreadCache>(threadKey(phone), add(row));
      await touchInbox(client, row);
    },
    onSettled: () => refreshSent(client, phone),
  };
}

/** inbox.error.<code> for a refused file, as sendError does for the API's codes. */
export function fileError(error: unknown): string {
  return error instanceof ChatFileError ? t.inbox.error[error.code] : sendError(error);
}
