import { ConflictException, NotFoundException } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../common/db/db.module';
import { errorCode } from '../scheduling/errors';
import { callSubmitReport, submitError } from './report-rpc';
import type { SubmitPayload } from './submit-plan';

const pgError = (code: string, message: string): PostgrestError =>
  ({ code, message, details: '', hint: '', name: 'PostgrestError' }) as PostgrestError;

describe('submitError: submit_report raises → HTTP (migration 130)', () => {
  it.each(['version_conflict', 'lesson_cancelled', 'invalid_transition'])('%s → 409 with the code', (code) => {
    const e = submitError(pgError('P0001', code));
    expect(e).toBeInstanceOf(ConflictException);
    expect(errorCode(e)).toBe(code);
  });

  it('report_not_found → 404', () => {
    expect(submitError(pgError('P0001', 'report_not_found'))).toBeInstanceOf(NotFoundException);
  });

  it('anything else stays a plain error (500)', () => {
    expect(errorCode(submitError(pgError('XX000', 'boom')))).toBeUndefined();
  });
});

describe('callSubmitReport', () => {
  const payload = { report_id: 'r', expected_version: 0, actor: 'a', report: {} } as unknown as SubmitPayload;

  it('calls submit_report with the payload as p', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: {}, error: null });
    await callSubmitReport({ rpc } as unknown as Db, payload);
    expect(rpc).toHaveBeenCalledWith('submit_report', { p: payload });
  });

  it('throws the mapped error', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: pgError('P0001', 'version_conflict') });
    await expect(callSubmitReport({ rpc } as unknown as Db, payload)).rejects.toBeInstanceOf(ConflictException);
  });
});
