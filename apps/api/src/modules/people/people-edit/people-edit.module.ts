import { Module } from '@nestjs/common';
import { GuardiansModule } from '@/modules/people/guardians';
import { StudentsModule } from '@/modules/people/students';
import { SalesModule } from '@/modules/sales/sales';
import { PeopleOwnership } from './access/people-ownership';
import { FamilyMoveService } from './family-move.service';
import { FamilySearchRepo } from './family-search.repo';
import { PeopleEditController } from './people-edit.controller';
import { PeopleEditRepo } from './people-edit.repo';
import { PeopleEditService } from './people-edit.service';
import { PeopleRoleController } from './people-role.controller';
import { PeopleViewService } from './people-view.service';
import { RoleSwitchService } from './role-switch.service';
import { StudentRecordsRepo } from './student-records.repo';

/** The writes are the admin's services; this adds narrower schemas, checks and audit rows. */
@Module({
  imports: [GuardiansModule, StudentsModule, SalesModule],
  controllers: [PeopleEditController, PeopleRoleController],
  providers: [
    PeopleOwnership,
    PeopleEditRepo,
    StudentRecordsRepo,
    FamilySearchRepo,
    PeopleEditService,
    PeopleViewService,
    FamilyMoveService,
    RoleSwitchService,
  ],
})
export class PeopleEditModule {}
