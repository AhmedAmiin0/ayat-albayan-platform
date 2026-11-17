import { lessonFilesApi } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/web-kit/lib/http/api';

// «ملفات الحلقة»: routes and schemas in @ab/client-core, bound here to the web's API client (the
// family's «التسجيلات» bind theirs in @ab/web-kit/portal/api).
const client = { apiFetch, apiSend };

export const lessonFiles = lessonFilesApi(client);
