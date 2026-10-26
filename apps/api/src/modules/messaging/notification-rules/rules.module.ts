import { Global, Module } from '@nestjs/common';
import { ActivityModule } from '../../../common/activity/activity.module';
import { SettingsRulesPort } from '../../../common/settings/settings-rules.port';
import { livekitEnv } from '../../../config/env/env.livekit';
import { loadEnv } from '../../../config/env/env';
import { NotificationRulesSettings } from './notification-rules.settings';
import { NotificationPolicy } from './policy/policy';
import { RulesSourceSettings } from './rules-source.settings';
import { RulesSettingsBridge } from './sync/rules.bridge';
import { RulesAliasController, RulesController } from './rules.controller';
import { RulesFacts } from './policy/rules.facts';
import { RulesJournal } from './store/rules.journal';
import { RulesParity } from './sync/rules.parity';
import { RulesPersist } from './store/rules.persist';
import { RULES_CLASSROOM, RulesQueries, type ClassroomOn } from './rules.queries';
import { RulesReader } from './store/rules.reader';
import { RulesService } from './rules.service';
import { DbRulesReader } from './store/rules.store';
import { RulesTable } from './store/rules.table';
import { RulesWriter } from './store/rules.writer';

/**
 * The notification rules (docs/23 §2c, phase 4; contract docs/23b). Global: every producer injects
 * NotificationPolicy (backed by DbRulesReader through the RulesReader port); CommunicationsService
 * injects RulesParity; the settings controller reaches the rules through SettingsRulesPort.
 * SendGate and LineHealthStore come from the global WhatsappModule; settings, DB and audit from the
 * global modules; ActivityWriter from ActivityModule.
 */
@Global()
@Module({
  imports: [ActivityModule],
  controllers: [RulesController, RulesAliasController],
  providers: [
    { provide: RULES_CLASSROOM, useFactory: (): ClassroomOn => () => livekitEnv(loadEnv()) !== null },
    NotificationRulesSettings,
    RulesSourceSettings,
    RulesQueries,
    RulesFacts,
    RulesTable,
    DbRulesReader,
    { provide: RulesReader, useExisting: DbRulesReader },
    NotificationPolicy,
    RulesPersist,
    RulesJournal,
    RulesWriter,
    RulesService,
    RulesParity,
    RulesSettingsBridge,
    { provide: SettingsRulesPort, useExisting: RulesSettingsBridge },
  ],
  exports: [NotificationPolicy, RulesReader, RulesParity, SettingsRulesPort],
})
export class NotificationRulesModule {}
