import type { AlertGroup, AlertTarget } from '@ab/client-core';
import type { IconName } from '@ab/web-kit/components/ui/display/icon';
import type { CardTone } from '@ab/web-kit/family/layout/FamilyCard';
import type { TileTone } from '@ab/web-kit/family/layout/IconTile';

/** A bell row's icon tile (boards: PortalWebAlerts): what the row opens decides it. */
interface AlertTile {
  icon: IconName;
  tone: TileTone;
}

const BY_SCREEN: Readonly<Record<AlertTarget['screen'], AlertTile>> = {
  report: { icon: 'receipt', tone: 'teal' },
  child: { icon: 'calendar', tone: 'green' },
  live: { icon: 'bolt', tone: 'green' },
  package: { icon: 'card', tone: 'gold' },
  chat: { icon: 'chat', tone: 'green' },
  schedule: { icon: 'calendar', tone: 'green' },
};

/** A row that only marks itself read. */
const PLAIN: AlertTile = { icon: 'bell', tone: 'teal' };

export const alertTile = (target: AlertTarget | null): AlertTile =>
  target ? BY_SCREEN[target.screen] : PLAIN;

/** Each day group's card edge (boards: today green, yesterday gold, this week teal). */
export const GROUP_TONE: Readonly<Record<AlertGroup, CardTone>> = {
  today: 'green',
  yesterday: 'gold',
  week: 'teal',
  older: 'plain',
};
