import type {
  SavedReply,
  SavedReplyCreate,
  SavedReplyMove,
  SavedReplyStaged,
  SavedReplyUpdate,
  SavedReplyUpload,
  SignedUpload,
} from '@ab/shared';

export interface SavedReplyEdit {
  id: string;
  body: SavedReplyUpdate;
}

export interface SavedReplyStep extends SavedReplyMove {
  id: string;
}

export interface SavedReplyStageInput {
  id: string;
  clientRequestId: string;
}

export interface SavedReplyCalls {
  all: () => Promise<SavedReply[]>;
  create: (body: SavedReplyCreate) => Promise<SavedReply>;
  update: (input: SavedReplyEdit) => Promise<SavedReply>;
  remove: (id: string) => Promise<void>;
  move: (input: SavedReplyStep) => Promise<SavedReply[]>;
  stage: (input: SavedReplyStageInput) => Promise<SavedReplyStaged>;
  uploadUrl: (body: SavedReplyUpload) => Promise<SignedUpload>;
}
