import type { TextStyle } from 'react-native';

export interface ContactIsSelfCardProps {
  studentId: string;
  /** Absent from an older API means the guardian. */
  value: boolean | undefined;
}

export interface ContactIsSelfCardText {
  label: TextStyle;
  hint: TextStyle;
  alert: TextStyle;
}

export interface ContactIsSelfCardState {
  /** The pick on screen: the one being saved, else the saved one. */
  shown: boolean;
  saving: boolean;
  failed: boolean;
  pick: (next: boolean) => void;
  text: ContactIsSelfCardText;
}
