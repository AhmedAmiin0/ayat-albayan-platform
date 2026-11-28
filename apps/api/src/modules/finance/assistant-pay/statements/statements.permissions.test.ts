import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { PERMISSION } from '@/common/auth/decorators';
import { AssistantStatementsController } from './assistant-statements.controller';

// Who may move a statement along: approving, taking an approval back (reopen) and reversing
// a payout (unpay) are the approver's (assistantpay.approve); building a draft, paying and the
// receipt upload are the writer's; reading is the reader's. A role with write but not approve
// cannot undo what an approver did.

const reflector = new Reflector();
const proto = AssistantStatementsController.prototype;
const needs = (handlers: (keyof typeof proto)[]) =>
  handlers.map((h) =>
    reflector.getAllAndOverride<readonly string[]>(PERMISSION, [
      proto[h],
      AssistantStatementsController,
    ]),
  );
const each = (permission: string) => [[permission], [permission], [permission]];

describe('AssistantStatementsController permissions', () => {
  it('approve, reopen and unpay need assistantpay.approve', () => {
    expect(needs(['approve', 'reopen', 'unpay'])).toEqual(each('assistantpay.approve'));
  });

  it('generate, pay and the receipt upload need write; the reads need read', () => {
    expect(needs(['generate', 'pay', 'receiptUploadUrl'])).toEqual(each('assistantpay.write'));
    expect(needs(['list', 'get', 'receipt'])).toEqual(each('assistantpay.read'));
  });
});
