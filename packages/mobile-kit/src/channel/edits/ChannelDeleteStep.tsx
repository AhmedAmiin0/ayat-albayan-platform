import { t } from '../../lib/i18n/i18n';
import { type, useTheme } from '../../theme';
import { InlineConfirm } from '../../ui/feedback/InlineConfirm';
import { AppText } from '../../ui/primitives/AppText';

interface ChannelDeleteStepProps {
  /** The admin deletes any message: the question says it is moderation. */
  admin: boolean;
  busy: boolean;
  /** The API's refusal in words (a window that just passed), or null. */
  problem: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Asked first; a refusal is shown in words under the question. */
export function ChannelDeleteStep(props: ChannelDeleteStepProps) {
  const { admin, busy, problem, onConfirm, onCancel } = props;
  const { color } = useTheme();
  const a = t.studentChannel.actions;
  const body = admin ? a.moderateBody : a.deleteBody;
  return (
    <>
      <InlineConfirm
        message={`${a.deleteTitle} ${body}`}
        confirmLabel={a.deleteConfirm}
        tone="danger"
        busy={busy}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
      {problem ? (
        <AppText accessibilityRole="alert" style={{ color: color.bad, fontSize: type.size.xs }}>
          {problem}
        </AppText>
      ) : null}
    </>
  );
}
