import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { useViewerTz } from '@/lib/viewer-tz';
import { ChannelThread } from './ChannelThread';

interface Props {
  studentId: string;
  /** The row's name in the title; absent (a push opened it) the thread names the student. */
  studentName?: string;
  onClose: () => void;
}

/**
 * The owning assistant's chat with a student's teacher and family in a panel (owner 2026-11-16:
 * she writes too; a closed channel stays read-only). Esc inside the chat closes only the inner
 * box; the unsent text survives closing the panel.
 */
export function SalesChannelDialog({ studentId, studentName, onClose }: Props) {
  const tz = useViewerTz();
  const base = t.studentChannel.monitorTitle;
  const title = studentName ? `${base} · ${studentName}` : base;
  return (
    <Dialog title={title} onClose={onClose}>
      <ChannelThread refs={{ audience: 'sales', studentId }} tz={tz} named={!studentName} />
    </Dialog>
  );
}
