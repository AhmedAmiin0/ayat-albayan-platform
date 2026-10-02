// Metro resolves an imported image to an asset id that <Image source> takes (expo-env.d.ts is not
// checked in, so the brand marks in src/ui/Mark.tsx need this declaration).
declare module '*.png' {
  const source: number;
  export default source;
}
