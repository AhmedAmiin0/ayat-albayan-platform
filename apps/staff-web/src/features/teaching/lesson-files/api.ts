import { lessonFilesApi } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/web-kit/lib/http/api';

// Routes and schemas live in @ab/client-core, bound here to the web's API client.
const client = { apiFetch, apiSend };

export const lessonFiles = lessonFilesApi(client);
