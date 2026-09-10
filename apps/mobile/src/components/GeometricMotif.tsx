import Svg, { Circle, G, Path, Polygon } from "react-native-svg";

/** A layered floral-geometric rosette inspired by traditional Islamic ornament. */
export function GeometricMotif({ size, color, fill, border, opacity = 1 }: {
  size: number;
  color: string;
  fill: string;
  border: string;
  opacity?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
      <Circle cx="50" cy="50" r="46" fill={fill} stroke={color} strokeWidth="2" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((rotation) => (
        <G key={rotation} transform={`rotate(${rotation} 50 50)`}>
          <Path d="M50 49 C37 37 38 24 50 9 C62 24 63 37 50 49Z" fill={fill} stroke={color} strokeWidth="1.5" />
          <Path d="M50 43 C45 34 46 27 50 20 C54 27 55 34 50 43Z" fill="none" stroke={color} strokeWidth="1" />
          <Circle cx="50" cy="14" r="1.8" fill={color} />
        </G>
      ))}
      <Polygon points="50,12 58,42 88,50 58,58 50,88 42,58 12,50 42,42" fill="none" stroke={color} strokeWidth="1.25" />
      <Circle cx="50" cy="50" r="24" fill={fill} stroke={color} strokeWidth="1.8" />
      <Circle cx="50" cy="50" r="19" fill="none" stroke={border} strokeWidth="1" />
      <Polygon points="50,27 55,45 73,50 55,55 50,73 45,55 27,50 45,45" fill="none" stroke={color} strokeWidth="1" />
    </Svg>
  );
}
