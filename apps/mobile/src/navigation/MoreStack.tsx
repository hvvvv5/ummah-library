import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../theme";
import { useT } from "../i18n/I18nProvider";
import { FONT } from "../fonts";
import { MoreMenuScreen } from "../screens/MoreMenuScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { NamesScreen } from "../screens/NamesScreen";
import { HadithScreen } from "../screens/HadithScreen";
import { PrivacyScreen } from "../screens/PrivacyScreen";
import { CollectionsScreen } from "../screens/CollectionsScreen";
import { ReadingGoalsScreen } from "../screens/ReadingGoalsScreen";
import { TafsirScreen } from "../screens/TafsirScreen";
import type { MoreStackParamList } from "./types";

const Stack = createNativeStackNavigator<MoreStackParamList>();

export function MoreStack() {
  const { colors } = useTheme();
  const t = useT();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.fg, fontFamily: FONT.bold },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="MoreMenu" component={MoreMenuScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: t("nav.journey") }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t("common.settings") }} />
      <Stack.Screen name="Names" component={NamesScreen} options={{ title: t("nav.names") }} />
      <Stack.Screen name="Hadith" component={HadithScreen} options={{ title: t("nav.hadith") }} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: t("nav.privacy") }} />
      <Stack.Screen name="Collections" component={CollectionsScreen} options={{ title: t("nav.bookmarks") }} />
      <Stack.Screen name="ReadingGoals" component={ReadingGoalsScreen} options={{ title: t("nav.goals") }} />
      <Stack.Screen name="Tafsir" component={TafsirScreen} options={{ title: t("nav.tafsir") }} />
    </Stack.Navigator>
  );
}
