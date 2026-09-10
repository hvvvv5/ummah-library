import { StyleSheet, Text, View } from "../Type";
import { GeometricMotif } from "./GeometricMotif";
import { useTheme } from "../theme";
import { FONT } from "../fonts";

/**
 * A layered geometric rosette for surah/āyah numbers. The number stays central
 * while the surrounding eightfold pattern provides a recognizably Islamic motif.
 */
export function AyahBadge({ n, size = 40 }: { n: number | string; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <GeometricMotif size={size} color={colors.accent} fill={colors.accentSoft} border={colors.border} opacity={0.94} />
      <View style={[styles.center, { width: size * 0.48, height: size * 0.48, backgroundColor: colors.bgElev, borderColor: colors.accent }]}>
        <Text style={[styles.num, { fontSize: size * 0.34, color: colors.fg }]}>{n}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", flexShrink: 0 },
  center: { position: "absolute", borderRadius: 999, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  num: { fontFamily: FONT.bold },
});
