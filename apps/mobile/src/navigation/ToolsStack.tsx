import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../theme";
import { useT } from "../i18n/I18nProvider";
import { ToolsListScreen } from "../screens/ToolsListScreen";
import { TasbihScreen } from "../screens/TasbihScreen";
import { AdhkarScreen } from "../screens/AdhkarScreen";
import { PrayerTimesScreen } from "../screens/PrayerTimesScreen";
import { PrayerTrackerScreen } from "../screens/PrayerTrackerScreen";
import { QiblaScreen } from "../screens/QiblaScreen";
import { MosqueFinderScreen } from "../screens/MosqueFinderScreen";
import { HijriCalendarScreen } from "../screens/HijriCalendarScreen";
import { ZakatScreen } from "../screens/ZakatScreen";
import { RamadanScreen } from "../screens/RamadanScreen";
import { DuasScreen } from "../screens/DuasScreen";
import { DownloadsScreen } from "../screens/DownloadsScreen";
import type { ToolsStackParamList } from "./types";

const Stack = createNativeStackNavigator<ToolsStackParamList>();

export function ToolsStack() {
  const { colors } = useTheme();
  const t = useT();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.fg },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="ToolsList" component={ToolsListScreen} options={{ title: t("nav.tools") }} />
      <Stack.Screen name="Tasbih" component={TasbihScreen} options={{ title: t("nav.tasbih") }} />
      <Stack.Screen name="Adhkar" component={AdhkarScreen} options={{ title: t("nav.adhkar") }} />
      <Stack.Screen name="PrayerTimes" component={PrayerTimesScreen} options={{ title: t("nav.prayerTimes") }} />
      <Stack.Screen name="PrayerTracker" component={PrayerTrackerScreen} options={{ title: t("nav.prayerTracker") }} />
      <Stack.Screen name="Qibla" component={QiblaScreen} options={{ title: t("nav.qibla") }} />
      <Stack.Screen name="Mosques" component={MosqueFinderScreen} options={{ title: t("nav.mosques") }} />
      <Stack.Screen name="HijriCalendar" component={HijriCalendarScreen} options={{ title: t("nav.calendar") }} />
      <Stack.Screen name="Zakat" component={ZakatScreen} options={{ title: t("nav.zakat") }} />
      <Stack.Screen name="Ramadan" component={RamadanScreen} options={{ title: t("nav.ramadan") }} />
      <Stack.Screen name="Duas" component={DuasScreen} options={{ title: t("nav.duas") }} />
      <Stack.Screen name="Downloads" component={DownloadsScreen} options={{ title: t("nav.downloads") }} />
    </Stack.Navigator>
  );
}
