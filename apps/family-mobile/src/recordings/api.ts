import { portalAssetsApi } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/mobile-kit';

// «التسجيلات» and the lesson page's reads (@ab/client-core), bound to the app's API client.
export const assets = portalAssetsApi({ apiFetch, apiSend });
