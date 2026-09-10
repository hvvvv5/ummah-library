import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "../Type";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Icon, type IconName } from "@ummahlibrary/ui";
import { useTheme, type Palette } from "../theme";
import { FONT } from "../fonts";
import type { ToolsStackParamList } from "../navigation/types";
import { useI18n } from "../i18n/I18nProvider";
import type { MessageKey } from "../i18n/messages";

const TOOLS: { screen: keyof ToolsStackParamList; icon: IconName; titleKey: MessageKey; descKey: MessageKey }[] = [
  { screen: "Tasbih", icon: "repeat", titleKey: "nav.tasbih", descKey: "tools.tasbihDesc" }, { screen: "Adhkar", icon: "sun", titleKey: "nav.adhkar", descKey: "tools.adhkarDesc" }, { screen: "Duas", icon: "heart", titleKey: "nav.duas", descKey: "tools.duasDesc" }, { screen: "PrayerTimes", icon: "home", titleKey: "nav.prayerTimes", descKey: "tools.prayerTimesDesc" }, { screen: "PrayerTracker", icon: "check", titleKey: "nav.prayerTracker", descKey: "tools.prayerTrackerDesc" }, { screen: "Qibla", icon: "compass", titleKey: "nav.qibla", descKey: "tools.qiblaDesc" }, { screen: "Mosques", icon: "route", titleKey: "nav.mosques", descKey: "tools.mosquesDesc" }, { screen: "HijriCalendar", icon: "moon", titleKey: "nav.calendar", descKey: "tools.calendarDesc" }, { screen: "Ramadan", icon: "star", titleKey: "nav.ramadan", descKey: "tools.ramadanDesc" }, { screen: "Zakat", icon: "layers", titleKey: "nav.zakat", descKey: "tools.zakatDesc" }, { screen: "Downloads", icon: "download", titleKey: "nav.downloads", descKey: "tools.downloadsDesc" },
];

type Props = NativeStackScreenProps<ToolsStackParamList, "ToolsList">;

export function ToolsListScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { dir, t } = useI18n();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      {TOOLS.map((item) => (
        <Pressable
          key={item.screen}
          style={styles.card}
          onPress={() => navigation.navigate(item.screen as never)}
          accessibilityRole="button"
        >
          <View style={styles.badge}>
            <Icon name={item.icon} size={20} color={colors.accent} sw={1.8} />
          </View>
          <View style={styles.text}>
            <Text style={[styles.title, { writingDirection: dir }]}>{t(item.titleKey)}</Text>
            <Text style={[styles.desc, { writingDirection: dir }]}>{t(item.descKey)}</Text>
          </View>
          <Icon name="chevR" size={18} color={colors.faint} sw={1.8} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    screen: { padding: 16, backgroundColor: c.bg, gap: 10 },
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.bgElev,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      gap: 14,
    },
    badge: {
      width: 40,
      height: 40,
      borderRadius: 11,
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    text: { flex: 1, gap: 2 },
    title: { color: c.fg, fontSize: 15, fontFamily: FONT.semibold },
    desc: { color: c.muted, fontSize: 13 },
  });
}
