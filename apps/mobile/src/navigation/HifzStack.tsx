import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../theme";
import { useT } from "../i18n/I18nProvider";
import { HifzDashboardScreen } from "../screens/HifzDashboardScreen";
import { HifzReviewScreen } from "../screens/HifzReviewScreen";
import type { HifzStackParamList } from "./types";

const Stack = createNativeStackNavigator<HifzStackParamList>();

export function HifzStack() {
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
      <Stack.Screen
        name="HifzDashboard"
        component={HifzDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HifzReview"
        component={HifzReviewScreen}
        options={{ title: t("nav.review"), headerBackTitle: t("nav.hifz") }}
      />
    </Stack.Navigator>
  );
}
