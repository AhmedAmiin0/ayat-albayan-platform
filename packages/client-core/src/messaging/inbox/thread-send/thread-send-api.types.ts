import type { MessageView, TextSendAnswer, ThreadTemplate, ThreadText } from '@ab/shared';

interface ChatParams {
  phone: string;
}

export interface TextSendInput {
  params: ChatParams;
  body: ThreadText;
}

export interface TemplateSendInput {
  params: ChatParams;
  body: ThreadTemplate;
}

export interface ThreadSendCalls {
  text: (input: TextSendInput) => Promise<TextSendAnswer>;
  template: (input: TemplateSendInput) => Promise<MessageView>;
}
