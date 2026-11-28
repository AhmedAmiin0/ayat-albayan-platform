import { replyConfirm } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/mobile-kit';

export const confirmReplyLesson = replyConfirm({ apiFetch, apiSend });
