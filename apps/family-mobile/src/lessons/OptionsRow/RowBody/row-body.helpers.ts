export const pressedStyle = ({ pressed }: { pressed: boolean }) => ({
  flex: 1,
  gap: 2,
  opacity: pressed ? 0.7 : 1,
});
