import { ConsoleLogger } from '@nestjs/common';
import { currentRequestId } from './request-id';

/**
 * Nest's console logger, plus `[req:<id>]` on every line written while serving a request, so one
 * request's lines can be found together (`docker logs ayat-api-a | grep req:<id>`). Jobs and the
 * boot log exactly as before.
 */
export class RequestIdLogger extends ConsoleLogger {
  protected override formatContext(context: string): string {
    const id = currentRequestId();
    const tag = id === undefined ? '' : `[req:${id}] `;
    return `${super.formatContext(context)}${tag}`;
  }
}
