import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { forgetSenderWake, onSenderWake } from '@/common/jobs';
import { MessageSender } from '@/modules/messaging/whatsapp/sender/message.sender';

/**
 * Registers the sender's kick for wakeSender() (common/jobs, docs/42 42-1). In onModuleInit, which
 * runs in every role (@BackgroundJob gates only onApplicationBootstrap): in a worker the kick runs
 * the pass here, in an `api` process the same kick() goes to the worker (kickWorker), as
 * Outbox.send's does. Kept out of message.sender.ts (at the file cap).
 */
@Injectable()
export class SenderWake implements OnModuleInit, OnModuleDestroy {
  /**
   * This app's own kick: destroy forgets only it (another app may have registered since). The jobs
   * queue notifications rows: the main lane (docs/42 42-7); a chat text never waits behind them.
   */
  private readonly kick = (): Promise<void> => this.sender.kick({ lane: 'main' });

  constructor(private readonly sender: MessageSender) {}

  onModuleInit(): void {
    onSenderWake(this.kick);
  }

  onModuleDestroy(): void {
    forgetSenderWake(this.kick);
  }
}
