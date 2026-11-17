import { lessonFilesApi, portalAssetsApi } from '@ab/client-core';
import { apiFetch, apiSend } from '@/lib/http/api';

// «ملفات الحلقة» and the family's «التسجيلات»: routes and schemas in @ab/client-core, bound here
// to the web's API client (the family app binds the same ones).
const client = { apiFetch, apiSend };

export const lessonFiles = lessonFilesApi(client);
export const portalAssets = portalAssetsApi(client);
