import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../theme";
import { useT } from "../i18n/I18nProvider";
import { SurahListScreen } from "../screens/SurahListScreen";
import { SurahReaderScreen } from "../screens/SurahReaderScreen";
import { JuzReaderScreen } from "../screens/JuzReaderScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { MushafPageScreen } from "../screens/MushafPageScreen";
import { PlansScreen } from "../screens/PlansScreen";
import { PlanDetailScreen } from "../screens/PlanDetailScreen";
import type { ReadStackParamList } from "./types";

const Stack = createNativeStackNavigator<ReadStackParamList>();

export function ReadStack() {
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
      <Stack.Screen name="SurahList" component={SurahListScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="SurahReader"
        component={SurahReaderScreen}
        options={{ title: "", headerBackTitle: t("nav.surahs") }}
      />
      <Stack.Screen
        name="JuzReader"
        component={JuzReaderScreen}
        options={({ route }) => ({ title: t("nav.juz", { number: route.params.juz }) })}
      />
      <Stack.Screen name="Search" component={SearchScreen} options={{ title: t("nav.search") }} />
      <Stack.Screen
        name="MushafPage"
        component={MushafPageScreen}
        options={{ title: "", headerBackTitle: t("nav.back") }}
      />
      <Stack.Screen name="Plans" component={PlansScreen} options={{ title: t("nav.plans") }} />
      <Stack.Screen name="PlanDetail" component={PlanDetailScreen} options={{ title: t("nav.plan"), headerBackTitle: t("nav.plans") }} />
    </Stack.Navigator>
  );
}
