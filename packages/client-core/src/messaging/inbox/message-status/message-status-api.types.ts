import type { MessageView, SendGateView } from '@ab/shared';

export interface MessageStatusCalls {
  gate: () => Promise<SendGateView>;
  retry: (id: string) => Promise<MessageView>;
  sentManually: (id: string) => Promise<MessageView>;
  appSend: (id: string) => Promise<MessageView>;
  handOff: (id: string) => Promise<MessageView>;
}
