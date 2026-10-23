import type { AcademySettings } from '@ab/shared';
import type { AuthUser } from '../auth/verify-token';

/**
 * What GET/PATCH /settings ask the notification rules (docs/26b m1/m3, docs/26 §2f), provided by the
 * global NotificationRulesModule (a port, so the settings module never imports a feature module):
 * - overlay: in module mode the 8 rule keys show what the rules say; otherwise the settings unchanged.
 *   It never changes any other key (messaging_enabled, comms_source, …).
 * - writeFollowUpHours: the 0.2.0 phone's followUpHours, applied as the follow-up rule's hours.
 */
export abstract class SettingsRulesPort {
  abstract overlay(settings: AcademySettings): Promise<AcademySettings>;
  abstract writeFollowUpHours(hours: readonly number[], actor: AuthUser): Promise<void>;
}
