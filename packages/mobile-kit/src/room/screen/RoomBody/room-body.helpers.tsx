import type { ReactNode } from 'react';
import type { RoomPhase } from '../../model/room-phase';
import { RoomPermission } from '../../preview/RoomPermission';
import { RoomPreview } from '../../preview/RoomPreview';
import { t } from '../../../lib/i18n/i18n';
import { RoomEnd } from '../RoomEnd';
import { RoomNotice } from '../RoomNotice';
import { Live } from './Live';
import type { RoomBodyProps } from './RoomBody.types';

type Step = RoomPhase['step'];
type PhaseOf = { [K in Step]: Extract<RoomPhase, { step: K }> };
type StepViews = { [K in Step]: (phase: PhaseOf[K], body: RoomBodyProps) => ReactNode };

const connecting = (phase: PhaseOf['checking' | 'joining']) => (
  <RoomNotice testID={`room-${phase.step}`} message={t.mobileRoom.connecting} busy />
);

const ended = (phase: PhaseOf['failed' | 'closed'], { screen }: RoomBodyProps) => (
  <RoomEnd
    phase={phase}
    kind={screen.session.target.kind}
    presence={screen.presence}
    onAgain={screen.session.retry}
    onBack={screen.back}
    onBrowser={screen.browser}
  />
);

/** The view for each step the session is on (docs/35 §3). */
const STEPS: StepViews = {
  checking: connecting,
  joining: connecting,
  permission: (_, { screen }) => (
    <RoomPermission
      onAllow={() => void screen.session.allow()}
      onSkip={() => void screen.session.skip()}
      onBrowser={screen.browser}
    />
  ),
  preview: (phase, { screen, platform }) => (
    <RoomPreview
      PreviewVideo={platform.PreviewVideo}
      preview={screen.session.preview}
      notice={phase.notice}
      onJoin={() => void screen.session.join()}
    />
  ),
  live: (_, body) => <Live {...body} />,
  failed: ended,
  closed: ended,
};

export function stepView<K extends Step>(phase: PhaseOf[K] & { step: K }, body: RoomBodyProps) {
  return STEPS[phase.step](phase, body);
}
