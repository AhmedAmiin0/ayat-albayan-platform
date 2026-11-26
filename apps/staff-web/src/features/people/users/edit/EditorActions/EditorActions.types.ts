export interface EditorActionsProps {
  /** The edit form the Save button submits. */
  formId: string;
  canWrite: boolean;
  saving: boolean;
  /** The new teacher / student / guardian role has no record yet. */
  recordMissing: boolean;
  onClose: () => void;
}
