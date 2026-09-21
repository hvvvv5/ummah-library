import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "../Type";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  TOTAL_PAGES_MADANI,
  ayahCountOf,
  isValidPageNumber,
  juzNumberOf,
  pageRange,
  type Ayah,
} from "@ummahlibrary/core";
import { api } from "../api";
import { BISMILLAH, toArabicDigits } from "../format";
import { recordMushafPage } from "../reading-goals";
import { useTheme, type Palette } from "../theme";
import { FONT } from "../fonts";
import { useSettings } from "../state/SettingsContext";
import type { ReadStackParamList } from "../navigation/types";
import { useI18n } from "../i18n/I18nProvider";
import {
  applyMushafEdgeResistance,
  decideMushafTurn,
  shouldClaimMushafSwipe,
  type MushafTurn,
} from "../mushaf-motion";

type Props = NativeStackScreenProps<ReadStackParamList, "MushafPage">;

interface Section {
  sura: number;
  name: string;
  transliteration: string;
  showBismillah: boolean;
  ayahs: Ayah[];
}

const SPRING_STIFFNESS = 290;
const SPRING_DAMPING = 32;
const SPRING_MASS = 0.9;

async function fetchPageSections(page: number): Promise<Section[]> {
  const { start, end } = pageRange(page);
  const result: Section[] = [];

  for (let sura = start.sura; sura <= end.sura; sura++) {
    const ayaStart = sura === start.sura ? start.aya : 1;
    const ayaEnd = sura === end.sura ? end.aya : ayahCountOf(sura);
    const d = await api.getSurah(sura);
    result.push({
      sura,
      name: d.surah.name,
      transliteration: d.surah.transliteration,
      showBismillah: d.surah.hasBismillah && sura !== 1 && ayaStart === 1,
      ayahs: d.ayahs.filter((a) => a.aya >= ayaStart && a.aya <= ayaEnd),
    });
  }

  return result;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function MushafPageScreen({ navigation, route }: Props) {
  // Deep links (page/:page) deliver the param as a string; in-app navigation
  // passes a number — coerce so both work.
  const n = Number(route.params.page);
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { dir, t } = useI18n();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { scale } = useSettings();

  const pageCacheRef = useRef(new Map<number, Section[]>());
  const inFlightRef = useRef(new Set<number>());
  const mountedRef = useRef(true);
  const currentPageRef = useRef(n);
  const settlingRef = useRef(false);
  const scrollYRef = useRef(0);
  const currentScrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const previousScrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const nextScrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const translateX = useRef(new Animated.Value(0)).current;

  const [, bumpCacheVersion] = useState(0);
  const [error, setError] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("mushaf.page", { number: n }) });
  }, [navigation, n, t]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      translateX.stopAnimation();
    };
  }, [translateX]);

  useEffect(() => {
    currentPageRef.current = n;
  }, [n]);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const loadPage = useCallback(async (page: number) => {
    if (!isValidPageNumber(page)) return;
    if (pageCacheRef.current.has(page) || inFlightRef.current.has(page)) return;

    inFlightRef.current.add(page);
    try {
      const sections = await fetchPageSections(page);
      if (!mountedRef.current) return;
      pageCacheRef.current.set(page, sections);
      bumpCacheVersion((v) => v + 1);
      if (currentPageRef.current === page) setError(false);
    } catch {
      if (mountedRef.current && currentPageRef.current === page) setError(true);
    } finally {
      inFlightRef.current.delete(page);
    }
  }, []);

  useEffect(() => {
    if (!isValidPageNumber(n)) {
      setError(true);
      return;
    }

    setError(false);
    void loadPage(n);
    if (n > 1) void loadPage(n - 1);
    if (n < TOTAL_PAGES_MADANI) void loadPage(n + 1);
  }, [loadPage, n]);

  const sections = pageCacheRef.current.get(n) ?? null;

  // Count this page towards the reading goal / khatma once it has loaded.
  useEffect(() => {
    if (sections) void recordMushafPage(n);
  }, [sections, n]);

  const canGoNext = n < TOTAL_PAGES_MADANI;
  const canGoPrevious = n > 1;
  const safeWidth = Math.max(width, 1);

  const currentScale = translateX.interpolate({
    inputRange: [-safeWidth, 0, safeWidth],
    outputRange: [0.992, 1, 0.992],
    extrapolate: "clamp",
  });
  const currentOpacity = translateX.interpolate({
    inputRange: [-safeWidth, 0, safeWidth],
    outputRange: [0.965, 1, 0.965],
    extrapolate: "clamp",
  });
  const nextScale = translateX.interpolate({
    inputRange: [0, safeWidth],
    outputRange: [0.992, 1],
    extrapolate: "clamp",
  });
  const nextOpacity = translateX.interpolate({
    inputRange: [0, safeWidth],
    outputRange: [0.965, 1],
    extrapolate: "clamp",
  });
  const previousScale = translateX.interpolate({
    inputRange: [-safeWidth, 0],
    outputRange: [1, 0.992],
    extrapolate: "clamp",
  });
  const previousOpacity = translateX.interpolate({
    inputRange: [-safeWidth, 0],
    outputRange: [1, 0.965],
    extrapolate: "clamp",
  });

  const settle = useCallback(
    (turn: MushafTurn, releaseVelocity: number) => {
      const target =
        turn === "next" ? n + 1 : turn === "previous" ? n - 1 : n;
      const toValue =
        turn === "next" ? safeWidth : turn === "previous" ? -safeWidth : 0;

      if (turn && isValidPageNumber(target)) void loadPage(target);

      const finalize = () => {
        if (turn && isValidPageNumber(target)) {
          navigation.setParams({ page: target });
        }
        translateX.setValue(0);
        settlingRef.current = false;
      };

      if (reduceMotion) {
        finalize();
        return;
      }

      settlingRef.current = true;
      const momentumScale = turn ? 1 : 0.35;
      const velocity = clamp(
        releaseVelocity * safeWidth * momentumScale,
        -1800,
        1800,
      );

      Animated.spring(translateX, {
        toValue,
        velocity,
        stiffness: SPRING_STIFFNESS,
        damping: SPRING_DAMPING,
        mass: SPRING_MASS,
        restDisplacementThreshold: 0.5,
        restSpeedThreshold: 0.5,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          finalize();
        } else {
          settlingRef.current = false;
        }
      });
    },
    [loadPage, n, navigation, reduceMotion, safeWidth, translateX],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          !settlingRef.current && shouldClaimMushafSwipe(gesture.dx, gesture.dy),
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          !settlingRef.current && shouldClaimMushafSwipe(gesture.dx, gesture.dy),
        onPanResponderGrant: () => {
          translateX.stopAnimation();
          const y = scrollYRef.current;
          previousScrollRef.current?.scrollTo({ y, animated: false });
          nextScrollRef.current?.scrollTo({ y, animated: false });
        },
        onPanResponderMove: (_event, gesture) => {
          translateX.setValue(
            applyMushafEdgeResistance(
              gesture.dx,
              safeWidth,
              canGoNext,
              canGoPrevious,
            ),
          );
        },
        onPanResponderRelease: (_event, gesture) => {
          const turn = decideMushafTurn({
            dx: gesture.dx,
            vx: gesture.vx,
            width: safeWidth,
            canGoNext,
            canGoPrevious,
          });
          settle(turn, gesture.vx);
        },
        onPanResponderTerminate: () => {
          settle(null, 0);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [canGoNext, canGoPrevious, safeWidth, settle, translateX],
  );

  const onCurrentScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYRef.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  const goToPage = useCallback(
    (page: number) => {
      if (!isValidPageNumber(page) || settlingRef.current) return;
      void loadPage(page);
      navigation.setParams({ page });
    },
    [loadPage, navigation],
  );

  function renderPageBody(page: number, interactive: boolean) {
    const data = pageCacheRef.current.get(page);
    if (!data) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      );
    }

    const juz = juzNumberOf(pageRange(page).start);

    return (
      <>
        <Text style={styles.pageMeta}>
          {t("mushaf.meta", { juz, page, total: TOTAL_PAGES_MADANI })}
        </Text>
        <View style={styles.page}>
          {data.map((s, i) => (
            <View key={s.sura} style={[styles.section, i > 0 && styles.sectionDivider]}>
              <Text style={styles.surahHeader}>{s.transliteration}</Text>
              {s.showBismillah && (
                <Text style={[styles.basmala, { fontSize: 22 * scale }]}>{BISMILLAH}</Text>
              )}
              <Text style={[styles.mushaf, { fontSize: 26 * scale, lineHeight: 52 * scale }]}>
                {s.ayahs.map((a) => (
                  <Text key={a.aya}>
                    {a.text}
                    <Text style={styles.endMarker}> ﴿{toArabicDigits(a.aya)}﴾ </Text>
                  </Text>
                ))}
              </Text>
              <Text style={styles.surahNameFoot}>﴿ {s.name} ﴾</Text>
            </View>
          ))}
        </View>

        {interactive && (
          <View style={styles.nav}>
            {page > 1 ? (
              <Pressable onPress={() => goToPage(page - 1)}>
                <Text style={[styles.navText, { writingDirection: dir }]}>
                  {t("surahReader.previous")}
                </Text>
              </Pressable>
            ) : (
              <View />
            )}
            {page < TOTAL_PAGES_MADANI ? (
              <Pressable onPress={() => goToPage(page + 1)}>
                <Text style={[styles.navText, { writingDirection: dir }]}>
                  {t("surahReader.next")}
                </Text>
              </Pressable>
            ) : (
              <View />
            )}
          </View>
        )}
      </>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={[styles.error, { writingDirection: dir }]}>
          {t("mushaf.loadError", { number: n })}
        </Text>
      </View>
    );
  }

  if (!sections) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.gestureViewport} {...panResponder.panHandlers}>
        <Animated.View
          style={[styles.track, { transform: [{ translateX }] }]}
          renderToHardwareTextureAndroid
          shouldRasterizeIOS
        >
          {canGoNext && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pageSlot,
                { left: -safeWidth, width: safeWidth },
                {
                  opacity: reduceMotion ? 1 : nextOpacity,
                  transform: [{ scale: reduceMotion ? 1 : nextScale }],
                },
              ]}
              renderToHardwareTextureAndroid
              shouldRasterizeIOS
            >
              <ScrollView
                ref={nextScrollRef}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
              >
                {renderPageBody(n + 1, false)}
              </ScrollView>
            </Animated.View>
          )}

          <Animated.View
            style={[
              styles.pageSlot,
              { left: 0, width: safeWidth },
              {
                opacity: reduceMotion ? 1 : currentOpacity,
                transform: [{ scale: reduceMotion ? 1 : currentScale }],
              },
            ]}
            renderToHardwareTextureAndroid
            shouldRasterizeIOS
          >
            <ScrollView
              ref={currentScrollRef}
              contentContainerStyle={styles.content}
              onScroll={onCurrentScroll}
              scrollEventThrottle={32}
            >
              {renderPageBody(n, true)}
            </ScrollView>
          </Animated.View>

          {canGoPrevious && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pageSlot,
                { left: safeWidth, width: safeWidth },
                {
                  opacity: reduceMotion ? 1 : previousOpacity,
                  transform: [{ scale: reduceMotion ? 1 : previousScale }],
                },
              ]}
              renderToHardwareTextureAndroid
              shouldRasterizeIOS
            >
              <ScrollView
                ref={previousScrollRef}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
              >
                {renderPageBody(n - 1, false)}
              </ScrollView>
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    gestureViewport: { flex: 1, overflow: "hidden" },
    track: { flex: 1 },
    pageSlot: {
      position: "absolute",
      top: 0,
      bottom: 0,
      backgroundColor: c.bg,
    },
    center: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    error: { color: c.error, fontSize: 15 },
    content: { paddingHorizontal: 18, paddingBottom: 40, paddingTop: 8 },
    pageMeta: { color: c.faint, fontSize: 12.5, textAlign: "center", marginBottom: 12 },
    // The Madani-Mushaf page frame — mirrors the web `.mushaf-page` so the
    // printed-page look is consistent across web and mobile.
    page: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      backgroundColor: c.bgElev,
      padding: 22,
      marginTop: 4,
    },
    section: {},
    sectionDivider: {
      borderTopWidth: 1,
      borderTopColor: c.border,
      marginTop: 22,
      paddingTop: 18,
    },
    surahHeader: {
      color: c.accent,
      fontSize: 15,
      fontFamily: FONT.bold,
      textAlign: "center",
      marginBottom: 4,
    },
    basmala: {
      color: c.fg,
      textAlign: "center",
      writingDirection: "rtl",
      marginVertical: 10,
      fontFamily: FONT.ar,
    },
    mushaf: {
      color: c.fg,
      textAlign: "justify",
      writingDirection: "rtl",
      fontFamily: FONT.ar,
    },
    endMarker: { color: c.accent, fontSize: 18, fontFamily: FONT.ar },
    // The Arabic surah name in ornamental brackets, centred at the foot of the
    // surah's block — mirrors the web reader's `.mushaf-surah-name`.
    surahNameFoot: {
      color: c.muted,
      fontSize: 19,
      textAlign: "center",
      writingDirection: "rtl",
      fontFamily: FONT.ar,
      marginTop: 22,
    },
    nav: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 24,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    navText: { color: c.accent, fontSize: 15, fontFamily: FONT.semibold },
  });
}
