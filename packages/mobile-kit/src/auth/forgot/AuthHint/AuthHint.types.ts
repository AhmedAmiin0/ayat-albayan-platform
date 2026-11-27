export type HintTone = 'quiet' | 'bad';

export interface AuthHintProps {
  text: string;
  tone?: HintTone;
}
