import { describe, expect, it } from 'vitest';
import { statementActions } from './statement-actions.js';

const ALL = { write: true, approve: true };
const WRITER = { write: true, approve: false };
const APPROVER = { write: false, approve: true };
const NONE = { write: false, approve: false };

describe('statementActions', () => {
  it.each([
    { status: 'draft', has_receipt: false, can: ALL, expected: ['approve', 'details'] },
    { status: 'draft', has_receipt: false, can: WRITER, expected: ['details'] },
    { status: 'approved', has_receipt: false, can: ALL, expected: ['pay', 'reopen', 'details'] },
    { status: 'approved', has_receipt: false, can: WRITER, expected: ['pay', 'details'] },
    { status: 'approved', has_receipt: false, can: APPROVER, expected: ['reopen', 'details'] },
    { status: 'approved', has_receipt: true, can: NONE, expected: ['details'] },
    { status: 'paid', has_receipt: true, can: ALL, expected: ['receipt', 'details', 'unpay'] },
    { status: 'paid', has_receipt: false, can: ALL, expected: ['details', 'unpay'] },
    { status: 'paid', has_receipt: true, can: WRITER, expected: ['receipt', 'details'] },
    { status: 'paid', has_receipt: false, can: NONE, expected: ['details'] },
  ] as const)('$status (receipt $has_receipt) with $can → $expected', (row) => {
    expect(statementActions({ status: row.status, has_receipt: row.has_receipt }, row.can)).toEqual(
      row.expected,
    );
  });
});
