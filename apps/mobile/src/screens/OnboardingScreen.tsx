import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "../Type";
import { SafeAreaView } from "react-native-safe-area-context";
import { Khatam } from "@ummahlibrary/ui";
import { useTheme, type Palette } from "../theme";
import { FONT } from "../fonts";
import { useI18n } from "../i18n/I18nProvider";
import type { MessageKey } from "../i18n/messages";

const SLIDES: { titleKey: MessageKey; bodyKey: MessageKey }[] = [
  {
    titleKey: "onboarding.slide1Title",
    bodyKey: "onboarding.slide1Body",
  },
  {
    titleKey: "onboarding.slide2Title",
    bodyKey: "onboarding.slide2Body",
  },
  {
    titleKey: "onboarding.slide3Title",
    bodyKey: "onboarding.slide3Body",
  },
];

/** First-run intro. Shown until the user finishes; `onDone` persists the flag. */
export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { colors } = useTheme();
  const { dir, t } = useI18n();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [i, setI] = useState(0);
  const slide = SLIDES[i]!;
  const last = i === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.art}>
          <Khatam size={184} color={colors.accent} sw={1.1} opacity={0.9} />
          <View style={styles.artInner}>
            <Khatam size={104} color={colors.accentHi} sw={1.4} opacity={0.5} />
          </View>
        </View>
        <Text style={[styles.title, { writingDirection: dir }]}>{t(slide.titleKey)}</Text>
        <Text style={[styles.body, { writingDirection: dir }]}>{t(slide.bodyKey)}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, d) => (
            <View key={d} style={[styles.dot, d === i && styles.dotOn]} />
          ))}
        </View>
        <Pressable style={styles.btn} onPress={() => (last ? onDone() : setI(i + 1))}>
          <Text style={[styles.btnText, { writingDirection: dir }]}>{last ? t("onboarding.getStarted") : t("onboarding.continue")}</Text>
        </Pressable>
        <Pressable onPress={onDone} hitSlop={8}>
          <Text style={[styles.skip, { writingDirection: dir }]}>{last ? " " : t("onboarding.skip")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 30 },
    content: { flex: 1, alignItems: "center", justifyContent: "center" },
    art: { alignItems: "center", justifyContent: "center", marginBottom: 40 },
    artInner: { position: "absolute" },
    title: {
      color: c.fg,
      fontSize: 30,
      fontFamily: FONT.extrabold,
      letterSpacing: -0.6,
      textAlign: "center",
      lineHeight: 36,
      marginBottom: 14,
    },
    body: {
      color: c.muted,
      fontSize: 16,
      lineHeight: 25,
      textAlign: "center",
      maxWidth: 320,
    },
    footer: { paddingBottom: 16, gap: 16, alignItems: "center" },
    dots: { flexDirection: "row", gap: 7 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.border },
    dotOn: { width: 22, backgroundColor: c.accent },
    btn: {
      width: "100%",
      height: 54,
      borderRadius: 14,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    btnText: { color: c.ink, fontSize: 16.5, fontFamily: FONT.extrabold },
    skip: { color: c.muted, fontSize: 14.5, paddingVertical: 4 },
  });
}
