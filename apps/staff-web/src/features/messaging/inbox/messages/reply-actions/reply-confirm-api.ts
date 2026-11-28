import { replyConfirm } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/web-kit';

export const confirmReplyLesson = replyConfirm({ apiFetch, apiSend });
