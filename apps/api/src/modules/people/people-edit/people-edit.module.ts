import { Module } from '@nestjs/common';
import { GuardiansModule } from '@/modules/people/guardians';
import { StudentsModule } from '@/modules/people/students';
import { FamilyMoveService } from './family-move.service';
import { FamilySearchRepo } from './family-search.repo';
import { PeopleEditController } from './people-edit.controller';
import { PeopleEditRepo } from './people-edit.repo';
import { PeopleEditService } from './people-edit.service';
import { PeopleRoleController } from './people-role.controller';
import { RoleSwitchService } from './role-switch.service';
import { StudentRecordsRepo } from './student-records.repo';

/**
 * People edits by the assistant (owner 2026-11-02): «تعديل البيانات», «ربط بولي أمر آخر» and
 * guardian ↔ student, under /people/* with their own keys (people.edit,
 * students.attach_guardian, people.switch_role). The writes are the admin's services; the module
 * adds the narrower schemas, the checks and the audit rows.
 */
@Module({
  imports: [GuardiansModule, StudentsModule],
  controllers: [PeopleEditController, PeopleRoleController],
  providers: [
    PeopleEditRepo,
    StudentRecordsRepo,
    FamilySearchRepo,
    PeopleEditService,
    FamilyMoveService,
    RoleSwitchService,
  ],
})
export class PeopleEditModule {}
