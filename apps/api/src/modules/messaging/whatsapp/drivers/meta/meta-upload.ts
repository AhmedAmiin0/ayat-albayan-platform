import { graphHttp, type GraphConn } from '@/modules/messaging/whatsapp/drivers/meta/graph';
import { uploadHandleSchema, uploadSessionSchema } from '@/modules/messaging/whatsapp/drivers/meta/meta-shapes';
import { WaError, type SampleFile } from '@/modules/messaging/whatsapp/whatsapp.types';

// Meta's Resumable Upload API (a template's sample header file, docs/12 §3.2).

/**
 * A session on the app (bearer, like every Graph call), then all the bytes at offset 0 to the
 * session id as given (`upload:…?sig=…`, never re-encoded) with `OAuth`. The handle comes back.
 */
export async function resumableUpload(conn: GraphConn, file: SampleFile): Promise<string> {
  const env = conn.env;
  // Kapso has no resumable upload: canUploadSamples() is false there, so only a bug gets here.
  if (env.provider === 'kapso' || !env.appId) {
    throw new WaError('WA_APP_ID is not set', { code: null, status: 0 });
  }
  const http = graphHttp(conn);
  const q = new URLSearchParams({
    file_name: file.name,
    file_length: String(file.bytes.byteLength),
    file_type: file.mime,
  });
  const path = `${encodeURIComponent(env.appId)}/uploads?${q.toString()}`;
  const session = await http.json({ path, method: 'POST', schema: uploadSessionSchema });
  const headers = { authorization: `OAuth ${env.accessToken}`, file_offset: '0' };
  const upload = { path: session.id, method: 'POST', raw: file.bytes, headers } as const;
  const done = await http.json({ ...upload, schema: uploadHandleSchema });
  return done.h;
}
