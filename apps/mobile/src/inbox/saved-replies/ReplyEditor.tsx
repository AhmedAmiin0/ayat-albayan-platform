import { SAVED_REPLY_BODY_MAX, SAVED_REPLY_TITLE_MAX, type SavedReply, type SavedReplyScope } from '@ab/shared';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { Field } from '@/core/ui/form/Field';
import { ErrorLine } from '../ErrorLine';
import { type ReplySave, useSaveReply } from './api';
import { insertToken, PlaceholderChips } from './PlaceholderChips';
import { replyError } from './reply-error';
import { type EditorFile, ReplyFileField } from './ReplyFileField';

export interface ReplyEditorProps {
  /** null = a new reply in `scope`. */
  reply: SavedReply | null;
  scope: SavedReplyScope;
  onDone: () => void;
}

/** POST for a new reply; PATCH sends the file only when it changed (null removes it, a new path replaces it). */
function saveInput(input: { reply: SavedReply | null; scope: SavedReplyScope; title: string; body: string; file: EditorFile }): ReplySave {
  const { reply, scope, title, body, file } = input;
  const attachment = file?.path ? { path: file.path, name: file.name } : null;
  if (!reply) return { id: null, create: { scope, title, body, attachment } };
  const changed = file === null ? reply.attachment !== null : !!file.path;
  return { id: reply.id, patch: changed ? { title, body, attachment } : { title, body } };
}

/** A title and a text, and no upload still running. */
const canSave = (d: { title: string; body: string; uploading: boolean }): boolean => d.title.trim() !== '' && d.body.trim() !== '' && !d.uploading;

/** Add or edit one reply: title (≤ 60), text (≤ 4096) with its placeholder pills, and an optional file. */
export function ReplyEditor({ reply, scope, onDone }: ReplyEditorProps) {
  const save = useSaveReply();
  const [title, setTitle] = useState(reply?.title ?? '');
  const [body, setBody] = useState(reply?.body ?? '');
  const [sel, setSel] = useState({ start: body.length, end: body.length });
  const [file, setFile] = useState<EditorFile>(reply?.attachment ? { name: reply.attachment.name } : null);
  const [uploading, setUploading] = useState(false);
  const ready = canSave({ title, body, uploading });
  const submit = () => {
    if (!ready) return;
    save.mutate(saveInput({ reply, scope, title: title.trim(), body: body.trim(), file }), { onSuccess: onDone });
  };
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 32 }}>
      <Field label={t.savedReplies.fieldTitle} value={title} onChangeText={setTitle} maxLength={SAVED_REPLY_TITLE_MAX} required />
      <Field
        label={t.savedReplies.fieldBody}
        value={body}
        // The cursor follows the typing; a tap elsewhere moves it (onSelectionChange comes after).
        onChangeText={(next) => {
          setBody(next);
          setSel({ start: next.length, end: next.length });
        }}
        onSelectionChange={(e) => setSel(e.nativeEvent.selection)}
        maxLength={SAVED_REPLY_BODY_MAX}
        multiline
        textAlignVertical="top"
        required
      />
      <PlaceholderChips
        onInsert={(key) => {
          const next = insertToken({ text: body, key, selection: sel });
          const at = sel.start + next.length - body.length;
          setBody(next);
          setSel({ start: at, end: at });
        }}
      />
      <ReplyFileField file={file} onChange={setFile} onBusy={setUploading} />
      {save.isError ? <ErrorLine message={replyError(save.error)} /> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button label={save.isPending ? t.common.saving : t.common.save} busy={save.isPending} disabled={!ready} onPress={submit} />
        <Button variant="ghost" label={t.common.cancel} onPress={onDone} />
      </View>
    </ScrollView>
  );
}
