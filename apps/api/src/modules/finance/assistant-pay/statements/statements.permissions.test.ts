import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { PERMISSION } from '../../../../common/auth/decorators';
import { AssistantStatementsController } from './assistant-statements.controller';

// Who may move a statement along: approving, taking an approval back (reopen) and reversing a payout
// (unpay) are the approver's (assistantpay.approve); building a draft, paying and the receipt upload are
// the writer's; reading is the reader's. A role with write but not approve cannot undo what an approver did.

const reflector = new Reflector();
const proto = AssistantStatementsController.prototype;
const needs = (handlers: (keyof typeof proto)[]) =>
  handlers.map((h) => reflector.getAllAndOverride<string>(PERMISSION, [proto[h], AssistantStatementsController]));

describe('AssistantStatementsController permissions', () => {
  it('approve, reopen and unpay need assistantpay.approve', () => {
    expect(needs(['approve', 'reopen', 'unpay'])).toEqual(['assistantpay.approve', 'assistantpay.approve', 'assistantpay.approve']);
  });

  it('generate, pay and the receipt upload need assistantpay.write; the reads need assistantpay.read', () => {
    expect(needs(['generate', 'pay', 'receiptUploadUrl'])).toEqual(['assistantpay.write', 'assistantpay.write', 'assistantpay.write']);
    expect(needs(['list', 'get', 'receipt'])).toEqual(['assistantpay.read', 'assistantpay.read', 'assistantpay.read']);
  });
});
