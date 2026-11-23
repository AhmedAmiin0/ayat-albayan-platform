import {
  ChannelFileError,
  channelFileCapMb,
  channelKey,
  newClientId,
  slotUploader,
  uploadChannelFile,
  type ChannelFileToSend,
} from '@ab/client-core';
import type { ChannelAttachmentInput } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  channelCountKeys,
  sendChannelMessage,
  type ChannelRef,
} from '#/components/channel/api.ts';
import { apiSend, errorCode, supabase } from '#/lib/http/index.ts';
import { t } from '#/lib/i18n/index.ts';

// A photo, PDF or voice note from the browser (docs/31 §2, docs/45): the shared check and upload
// (client-core uploadChannelFile) over this kit's HTTP call and its Supabase client.

/** The slot upload: «minio:» → a PUT to its signed URL, else Supabase Storage. Never rejects. */
const uploadSigned = slotUploader((bucket) => supabase.storage.from(bucket));

const askSlot = (path: string, fields: object): Promise<unknown> => apiSend('POST', path, fields);

/** POST …/attachments/upload-url, then the upload: the message's `attachment`. */
const uploadWebFile = (ref: ChannelRef, file: ChannelFileToSend): Promise<ChannelAttachmentInput> =>
  uploadChannelFile(ref, file, { askSlot, upload: uploadSigned });

/** A picked browser file as the chat sends it (its own name and type). */
export const pickedFile = (file: File): ChannelFileToSend => ({
  mime: file.type,
  name: file.name,
  size: file.size,
  bytes: file,
});

const errors: Readonly<Record<string, string>> = t.studentChannel.actions.errors;

/**
 * A refused file in words: too large (its type's cap), a type not taken, the API's reason (the
 * chat closed…), else «تعذّر رفع الملف».
 */
function fileSendProblem(e: unknown, mime: string): string {
  const media = t.studentChannel.media;
  if (e instanceof ChannelFileError) {
    return media[e.code].replace('{n}', String(channelFileCapMb(mime)));
  }
  return errors[errorCode(e) ?? ''] ?? media.failed;
}

/** A file to send and the message it answers. */
export interface FileSend {
  file: ChannelFileToSend;
  replyToId?: string | undefined;
}

/**
 * A photo, PDF or voice note: the upload first, then the message that carries it (its own
 * client_id, the quoted message if any); the thread and the counts re-read after. «جارٍ رفع
 * الملف…» while it goes, the refusal in words if it fails.
 */
export function useSendFile(refs: ChannelRef) {
  const client = useQueryClient();
  const [mime, setMime] = useState('');
  const mutation = useMutation({
    mutationFn: async ({ file, replyToId }: FileSend) => {
      const attachment = await uploadWebFile(refs, file);
      const clientId = newClientId();
      return sendChannelMessage(refs, { body: '', clientId, replyToId, attachment });
    },
    onSettled: () =>
      Promise.all(
        [channelKey(refs.audience, refs.studentId), ...channelCountKeys(refs.studentId)].map(
          (queryKey) => client.invalidateQueries({ queryKey }),
        ),
      ),
  });
  const send = (input: FileSend) => {
    setMime(input.file.mime);
    return mutation.mutateAsync(input);
  };
  return {
    send,
    uploading: mutation.isPending,
    problem: mutation.isError ? fileSendProblem(mutation.error, mime) : null,
  };
}
