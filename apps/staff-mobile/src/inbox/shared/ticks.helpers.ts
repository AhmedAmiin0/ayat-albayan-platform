// Anchored so a status word never matches a longer status that starts with it.
export const ticksLabel = (word: string): RegExp => new RegExp(`^${word}( · |$)`);
