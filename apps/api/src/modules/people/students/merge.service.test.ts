import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { MergeService } from './merge.service';

const OPTS = { keptId: 'a', mergedId: 'b', actorId: 'u1' };

describe('MergeService (R-STU-03, R-NFR-03)', () => {
  it('calls the atomic merge_students function with kept, merged and actor', async () => {
    const { db, argsOf } = fakeDb({ 'rpc:merge_students': [{ data: 'm1' }] });
    await expect(new MergeService(db).merge(OPTS)).resolves.toEqual({ merge_id: 'm1' });
    expect(argsOf('rpc:merge_students', 'rpc')).toEqual([{ p_kept: 'a', p_merged: 'b', p_actor: 'u1' }]);
  });

  it('missing student (P0002) is 404', async () => {
    const { db } = fakeDb({ 'rpc:merge_students': [{ error: { code: 'P0002', message: 'student not found' } }] });
    await expect(new MergeService(db).merge(OPTS)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('merging a student into itself (22023) is 400', async () => {
    const { db } = fakeDb({ 'rpc:merge_students': [{ error: { code: '22023', message: 'self' } }] });
    await expect(new MergeService(db).merge({ ...OPTS, mergedId: 'a' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('no id back is a 500, never a silent success', async () => {
    const { db } = fakeDb({ 'rpc:merge_students': [{ data: null }] });
    await expect(new MergeService(db).merge(OPTS)).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
