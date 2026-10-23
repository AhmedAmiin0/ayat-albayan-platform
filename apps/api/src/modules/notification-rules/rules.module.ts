import { Global, Module } from '@nestjs/common';
import { ActivityModule } from '../../common/activity/activity.module';
import { SettingsRulesPort } from '../../common/settings/settings-rules.port';
import { livekitEnv } from '../../env.livekit';
import { loadEnv } from '../../env';
import { NotificationRulesSettings } from './notification-rules.settings';
import { NotificationPolicy } from './policy';
import { RulesSourceSettings } from './rules-source.settings';
import { RulesSettingsBridge } from './rules.bridge';
import { RulesAliasController, RulesController } from './rules.controller';
import { RulesFacts } from './rules.facts';
import { RulesJournal } from './rules.journal';
import { RulesParity } from './rules.parity';
import { RulesPersist } from './rules.persist';
import { RULES_CLASSROOM, RulesQueries, type ClassroomOn } from './rules.queries';
import { RulesReader } from './rules.reader';
import { RulesService } from './rules.service';
import { DbRulesReader } from './rules.store';
import { RulesTable } from './rules.table';
import { RulesWriter } from './rules.writer';

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
