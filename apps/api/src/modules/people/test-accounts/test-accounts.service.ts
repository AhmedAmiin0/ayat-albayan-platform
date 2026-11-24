import { testFlagResultSchema, type TestFlagResult } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { TestFlagReader } from '@/common/auth/test-flag';
import { notFound } from '@/common/http/errors';
import { TestAccountsRepo, type TestFlagWrite } from './test-accounts.repo';

/** The 404 code of each target. */
const MISSING: Readonly<Record<TestFlagWrite['kind'], string>> = {
  student: 'student_not_found',
  profile: 'user_not_found',
};

/** docs/56: the whole family flips, audited in one transaction; grants no visibility. */
@Injectable()
export class TestAccountsService {
  constructor(
    @Inject(TestAccountsRepo) private readonly repo: TestAccountsRepo,
    @Inject(TestFlagReader) private readonly flags: TestFlagReader,
  ) {}

  async set(write: TestFlagWrite): Promise<TestFlagResult> {
    const flipped = await this.repo.set(write);
    if (!flipped) throw notFound(MISSING[write.kind]);
    this.flags.forget(flipped.profiles);
    return testFlagResultSchema.parse({ id: flipped.id, is_test: flipped.is_test });
  }
}
