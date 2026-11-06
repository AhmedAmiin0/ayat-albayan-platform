import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { onSenderWake } from '@/common/jobs';
import { MessageSender } from '@/modules/messaging/whatsapp/sender/message.sender';

/**
 * Registers the sender's kick for wakeSender() (common/jobs, docs/42 42-1). In onModuleInit, which
 * runs in every role (@BackgroundJob gates only onApplicationBootstrap): in a worker the kick runs
 * the pass here, in an `api` process the same kick() goes to the worker (kickWorker), as
 * Outbox.send's does. Kept out of message.sender.ts (at the file cap).
 */
@Injectable()
export class SenderWake implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly sender: MessageSender) {}

  onModuleInit(): void {
    onSenderWake(() => this.sender.kick());
  }

  onModuleDestroy(): void {
    onSenderWake(null);
  }
}
