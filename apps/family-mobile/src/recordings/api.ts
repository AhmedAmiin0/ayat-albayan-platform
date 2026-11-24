import { portalAssetsApi } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/mobile-kit';

export const assets = portalAssetsApi({ apiFetch, apiSend });
