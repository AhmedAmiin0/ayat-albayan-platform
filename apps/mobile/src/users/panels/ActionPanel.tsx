import type { UserDetail } from '@ab/shared';
import { DeletePanel } from './DeletePanel';
import { DisablePanel } from './DisablePanel';
import { ResetPasswordPanel } from './ResetPasswordPanel';
import type { ActionMode } from './UserActions';

interface ActionPanelProps {
  mode: ActionMode;
  user: UserDetail;
  onBack: () => void;
  onDone: (message: string) => void;
}

/** The step an account action needs before it runs (the web's three dialogs). */
export function ActionPanel({ mode, user, onBack, onDone }: ActionPanelProps) {
  if (mode === 'disable') return <DisablePanel user={user} onBack={onBack} onDone={onDone} />;
  if (mode === 'reset') return <ResetPasswordPanel user={user} onBack={onBack} />;
  return <DeletePanel user={user} onBack={onBack} onDone={onDone} />;
}
