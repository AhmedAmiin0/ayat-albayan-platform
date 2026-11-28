import type {
  ChatFileParams,
  MessageView,
  PdfPageParams,
  SignedUpload,
  ThreadFile,
  ThreadFileSendInput,
  ThreadFileUpload,
  ThreadMediaItem,
  ThreadPdfPage,
} from '@ab/shared';

type ChatParams = Pick<ChatFileParams, 'phone'>;

export interface ChatFileUploadInput {
  params: ChatParams;
  body: ThreadFileUpload;
}

export interface ChatFileSendInput {
  params: ChatParams;
  body: ThreadFileSendInput;
}

export interface ChatFileCalls {
  file: (params: ChatFileParams) => Promise<ThreadFile>;
  download: (params: ChatFileParams) => Promise<ThreadFile>;
  pdfPage: (params: PdfPageParams) => Promise<ThreadPdfPage>;
  media: (params: ChatParams) => Promise<ThreadMediaItem[]>;
  mediaFile: (params: ChatFileParams) => Promise<ThreadFile>;
  uploadUrl: (input: ChatFileUploadInput) => Promise<SignedUpload>;
  send: (input: ChatFileSendInput) => Promise<MessageView>;
}
