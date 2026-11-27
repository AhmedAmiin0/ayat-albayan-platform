import { lessonFilesApi, studentRecordingsApi } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/web-kit';

// Routes and schemas live in @ab/client-core, bound here to the web's API client.
const client = { apiFetch, apiSend };

export const lessonFiles = lessonFilesApi(client);

export const recordings = studentRecordingsApi(client);
