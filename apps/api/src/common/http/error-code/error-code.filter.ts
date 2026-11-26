import { type ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { withCode } from './error-code';

type Replies = Parameters<BaseExceptionFilter['handleUnknownError']>[2];

function readKey(target: Replies, key: string | symbol, receiver: unknown): unknown {
  return Reflect.get(target, key, receiver);
}

/** The adapter with every reply body given its code; every other call goes through as is. */
const codedReplies = (adapter: Replies): Replies =>
  new Proxy(adapter, {
    get: (target, key, receiver) =>
      key === 'reply'
        ? (res: unknown, body: unknown, status: number): void => {
            target.reply(res, withCode(body, status), status);
          }
        : readKey(target, key, receiver),
  });

const recoded = (e: HttpException) =>
  new HttpException(withCode(e.getResponse(), e.getStatus()), e.getStatus(), { cause: e });

/** Nest's own error handling and logging, with a `code` beside the message of every answer. */
@Catch()
export class ErrorCodeFilter extends BaseExceptionFilter {
  override catch(e: unknown, host: ArgumentsHost): void {
    super.catch(e instanceof HttpException ? recoded(e) : e, host);
  }

  override handleUnknownError(e: unknown, host: ArgumentsHost, adapter: Replies): void {
    super.handleUnknownError(e, host, codedReplies(adapter));
  }
}
