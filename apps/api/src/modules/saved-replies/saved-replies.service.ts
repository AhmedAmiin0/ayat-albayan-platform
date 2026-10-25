import type { SavedReply, SavedReplyCreate, SavedReplyStaged, SavedReplyUpdate, SignedUpload, SavedReplyUpload } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { forbidden, notFound } from '../scheduling/errors';
import { managesShared } from './saved-replies.guard';
import { inListOrder, toSavedReply, type SavedReplyRow } from './saved-replies.mapper';
import { SavedReplyFiles, type StoredFile } from './saved-replies.files';
import { SavedRepliesQueries, type ReplyPatch } from './saved-replies.queries';
import { movedOrder } from './saved-replies.order';

type Attachment = SavedReplyCreate['attachment'];

const gone = () => notFound('saved_reply_not_found');

/** The attachment columns for a stored file and its name, or all null. */
const attachmentColumns = (file: StoredFile | null, name: string | null) => ({
  attachment_path: file?.path ?? null,
  attachment_mime: file?.mime ?? null,
  attachment_size: file?.size ?? null,
  attachment_name: file ? name : null,
});

/**
 * «الردود السريعة» (owner 2026-10-25). The SHARED list is read by every inbox user and written with
 * saved_replies.manage (403 saved_replies_forbidden); a PERSONAL reply is its owner's alone: another
 * person's is 404, as if it did not exist. A removed reply or a replaced attachment takes its file
 * out of Storage. Nothing here sends anything: stage() only prepares the chat's own file send.
 */
@Injectable()
export class SavedRepliesService {
  constructor(
    private readonly queries: SavedRepliesQueries,
    private readonly files: SavedReplyFiles,
  ) {}

  async list(user: AuthUser): Promise<SavedReply[]> {
    return inListOrder(await this.queries.visibleTo(user.id));
  }

  async create(user: AuthUser, input: SavedReplyCreate): Promise<SavedReply> {
    const owner = input.scope === 'shared' ? null : user.id;
    if (owner === null && !managesShared(user)) throw forbidden('saved_replies_forbidden');
    const file = await this.verified(input.attachment, user.id);
    const last = (await this.queries.listOf(owner)).reduce((max, r) => Math.max(max, r.position), -1);
    const row = await this.queries.insert({
      owner_profile_id: owner,
      title: input.title,
      body: input.body,
      ...attachmentColumns(file, input.attachment?.name ?? null),
      position: last + 1,
      created_by: user.id,
      updated_by: user.id,
    });
    return toSavedReply(row);
  }

  async update(user: AuthUser, id: string, input: SavedReplyUpdate): Promise<SavedReply> {
    const row = await this.writable(user, id);
    const oldPath = row.attachment_path;
    const patch: ReplyPatch = { updated_by: user.id };
    if (input.title !== undefined) patch.title = input.title;
    if (input.body !== undefined) patch.body = input.body;
    const replaced = input.attachment !== undefined && input.attachment?.path !== oldPath;
    Object.assign(patch, await this.attachmentPatch({ attachment: input.attachment, replaced, actorId: user.id }));
    const next = await this.queries.update(id, patch);
    if (!next) throw gone();
    if (replaced) await this.files.remove(oldPath);
    return toSavedReply(next);
  }

  /** 204 even when it is already gone (idempotent); its file leaves Storage with it. */
  async remove(user: AuthUser, id: string): Promise<void> {
    const row = await this.queries.one(id);
    if (!row || (row.owner_profile_id !== null && row.owner_profile_id !== user.id)) return;
    this.assertWrites(user, row);
    const path = row.attachment_path;
    await this.queries.remove(id);
    await this.files.remove(path);
  }

  /** One place up or down within its own list; the list is renumbered 0…n−1. */
  async move(user: AuthUser, id: string, direction: 'up' | 'down'): Promise<SavedReply[]> {
    const row = await this.writable(user, id);
    const siblings = await this.queries.listOf(row.owner_profile_id);
    await this.queries.setPositions(movedOrder({ rows: siblings, id, direction }), user.id);
    return this.list(user);
  }

  uploadUrl(user: AuthUser, input: SavedReplyUpload): Promise<SignedUpload> {
    return this.files.uploadUrl(user.id, input);
  }

  /** The reply's attachment as this sender's chat file (out/{sender}/{request}/…); 404 when it has none. */
  async stage(user: AuthUser, id: string, requestId: string): Promise<SavedReplyStaged> {
    const row = await this.visible(user, id);
    const { attachment_path: path, attachment_mime: mime, attachment_size: size, attachment_name: name } = row;
    if (!path || !mime || !size || !name) throw gone();
    return this.files.stage({ file: { path, mime, size }, name, actorId: user.id, requestId });
  }

  /** A shared reply, or one of the caller's own; anyone else's is 404. */
  private async visible(user: AuthUser, id: string): Promise<SavedReplyRow> {
    const row = await this.queries.one(id);
    if (!row || (row.owner_profile_id !== null && row.owner_profile_id !== user.id)) throw gone();
    return row;
  }

  private async writable(user: AuthUser, id: string): Promise<SavedReplyRow> {
    const row = await this.visible(user, id);
    this.assertWrites(user, row);
    return row;
  }

  private assertWrites(user: AuthUser, row: SavedReplyRow): void {
    if (row.owner_profile_id === null && !managesShared(user)) throw forbidden('saved_replies_forbidden');
  }

  /** undefined keeps the file; null removes it; the same path only renames it; a new path is checked. */
  private async attachmentPatch(input: { attachment: Attachment; replaced: boolean; actorId: string }): Promise<ReplyPatch> {
    const { attachment, replaced, actorId } = input;
    if (attachment === undefined) return {};
    if (attachment === null) return attachmentColumns(null, null);
    if (!replaced) return { attachment_name: attachment.name };
    return attachmentColumns(await this.verified(attachment, actorId), attachment.name);
  }

  private async verified(attachment: Attachment, actorId: string): Promise<StoredFile | null> {
    return attachment ? this.files.verify(attachment.path, actorId) : null;
  }
}
