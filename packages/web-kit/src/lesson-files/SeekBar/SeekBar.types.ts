export interface Props {
  position: number;
  duration: number;
  seek: (position: number) => void;
}
