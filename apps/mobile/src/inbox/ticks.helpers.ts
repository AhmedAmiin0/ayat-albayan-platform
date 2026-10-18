// Tests only: a bubble's DeliveryTicks label is the status word, then « · » and its times when Meta
// reported any. Anchored, so «أُرسلت» never matches «أُرسلت يدويًا».
export const ticksLabel = (word: string): RegExp => new RegExp(`^${word}( · |$)`);
