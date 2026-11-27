import type { ReactionResult, ThreadReaction } from '@ab/shared';

export interface ReactionInput {
  params: { phone: string; id: string };
  body: ThreadReaction;
}

export interface MessageReactionCalls {
  react: (input: ReactionInput) => Promise<ReactionResult>;
}
