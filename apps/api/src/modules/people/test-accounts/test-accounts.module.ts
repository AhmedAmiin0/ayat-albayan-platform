import { Module } from '@nestjs/common';
import { UserTestController } from './test-accounts.controller';
import { StudentTestController } from './student-test.controller';
import { TestAccountsRepo } from './test-accounts.repo';
import { TestAccountsService } from './test-accounts.service';

/** Test accounts (docs/56): the two admin switches. TestFlagReader comes from AuthModule. */
@Module({
  controllers: [UserTestController, StudentTestController],
  providers: [TestAccountsRepo, TestAccountsService],
})
export class TestAccountsModule {}
