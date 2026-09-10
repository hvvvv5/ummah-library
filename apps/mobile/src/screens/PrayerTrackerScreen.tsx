import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "../Type";
import {
  OBLIGATORY_PRAYERS,
  type FastingQadaLog,
  type HaidLog,
  type PrayerStatus,
  type PrayerTrackerLog,
  type QadaLog,
  adjustFastingMadeUp,
  adjustQada,
  currentPeriod,
  fastingMadeUp,
  fastingQadaOwed,
  fastingQadaRemaining,
  isDatePaused,
  longestPrayerStreakWithPause,
  nextPrayerStatus,
  onTimeRate,
  owedFor,
  periodLength,
  prayedCount,
  prayerStreakWithPause,
  recentDays,
  setPrayerStatus,
  statusFor,
  togglePauseToday,
  totalOwed,
} from "@ummahlibrary/core";
import { useTheme, type Palette } from "../theme";
import { mobilePrayerTrackerStore as prayerStore } from "../prayer-tracker-store";
import { mobileQadaStore as qadaStore } from "../qada-store";
import { mobileHaidStore as haidStore } from "../haid-store";
import { mobileFastingQadaStore as fastingQadaStore } from "../fasting-qada-store";
import { KEYS, getString } from "../storage";
import { localISODate } from "../utils";
import { useI18n } from "../i18n/I18nProvider";

const STATUS_LABEL: Record<PrayerStatus, "prayerTracker.notYet" | "prayerTracker.onTime" | "prayerTracker.late"> = {
  none: "prayerTracker.notYet",
  ontime: "prayerTracker.onTime",
  late: "prayerTracker.late",
};

const PRAYER_LABEL_KEY = {
  fajr: "prayer.fajr",
  sunrise: "prayer.sunrise",
  dhuhr: "prayer.dhuhr",
  asr: "prayer.asr",
  maghrib: "prayer.maghrib",
  isha: "prayer.isha",
} as const;

function prayerLabelKey(prayer: (typeof OBLIGATORY_PRAYERS)[number]) {
  return PRAYER_LABEL_KEY[prayer];
}

export function PrayerTrackerScreen() {
  const { colors } = useTheme();
  const { dir, t } = useI18n();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const LATE = "#c98a57";
  const statusColor = (s: PrayerStatus) =>
    s === "ontime" ? colors.accent : s === "late" ? LATE : colors.border;

  const [log, setLog] = useState<PrayerTrackerLog>({});
  const [qada, setQadaLog] = useState<QadaLog>({});
  const [haid, setHaid] = useState<HaidLog>([]);
  const [fastingQada, setFastingQada] = useState<FastingQadaLog>({ madeUp: 0 });
  const [hijriAdjust, setHijriAdjust] = useState(0);
  const today = localISODate(new Date());

  useEffect(() => {
    void prayerStore.read().then(setLog);
    void qadaStore.read().then(setQadaLog);
    void haidStore.read().then(setHaid);
    void fastingQadaStore.read().then(setFastingQada);
    void getString(KEYS.hijriAdjust).then((raw) => {
      const n = Number(raw);
      if (Number.isFinite(n)) setHijriAdjust(n);
    });
  }, []);

  function adjustQadaFor(prayer: (typeof OBLIGATORY_PRAYERS)[number], delta: number) {
    setQadaLog((prev) => {
      const next = adjustQada(prev, prayer, delta);
      void qadaStore.write(next);
      return next;
    });
  }

  function toggleHaid() {
    setHaid((prev) => {
      const next = togglePauseToday(prev, today);
      void haidStore.write(next);
      return next;
    });
  }

  function adjustFasting(delta: number, owed: number) {
    setFastingQada((prev) => {
      const next = adjustFastingMadeUp(prev, delta, owed);
      void fastingQadaStore.write(next);
      return next;
    });
  }

  function cycleDate(date: string, prayer: (typeof OBLIGATORY_PRAYERS)[number]) {
    setLog((prev) => {
      const next = setPrayerStatus(prev, date, prayer, nextPrayerStatus(statusFor(prev[date], prayer)));
      void prayerStore.write(next);
      return next;
    });
  }

  function cycle(prayer: (typeof OBLIGATORY_PRAYERS)[number]) {
    cycleDate(today, prayer);
  }

  const todayLog = log[today];
  const days = recentDays(log, today, 7);
  const haidCurrent = currentPeriod(haid);
  const haidDays = haidCurrent ? periodLength(haidCurrent, today) : 0;
  const fastingOwed = fastingQadaOwed(haid, today, hijriAdjust);
  const fastingRemaining = fastingQadaRemaining(fastingQada, fastingOwed);
  const fastingDone = fastingMadeUp(fastingQada, fastingOwed);
  const stats: [string, string][] = [
    [`${prayedCount(todayLog)}/5`, t("prayerTracker.prayedToday")],
    [`${prayerStreakWithPause(log, haid, today)} 🔥`, t("prayerTracker.dayStreak")],
    [`${onTimeRate(log, today)}%`, t("prayerTracker.onTime30")],
    [`${longestPrayerStreakWithPause(log, haid)}`, t("prayerTracker.bestStreak")],
  ];

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.statsRow}>
        {stats.slice(0, 2).map(([v, l]) => (
          <Stat key={l} value={v} label={l} colors={colors} />
        ))}
      </View>
      <View style={styles.statsRow}>
        {stats.slice(2).map(([v, l]) => (
          <Stat key={l} value={v} label={l} colors={colors} />
        ))}
      </View>

      <Text style={[styles.sectionLabel, { writingDirection: dir }]}>{t("prayerTracker.today")}</Text>
      <View style={styles.todayRow}>
        {OBLIGATORY_PRAYERS.map((p) => {
          const st = statusFor(todayLog, p);
          const lit = st !== "none";
          return (
            <Pressable
              key={p}
              style={[styles.prayer, lit && { borderColor: statusColor(st), backgroundColor: colors.accentSoft }]}
              onPress={() => cycle(p)}
            >
              <View
                style={[
                  styles.dot,
                  st === "ontime"
                    ? { backgroundColor: colors.accent }
                    : { borderWidth: 1.5, borderColor: statusColor(st) },
                ]}
              >
                <Text style={[styles.dotMark, { color: st === "ontime" ? colors.ink : statusColor(st) }]}>
                  {st === "none" ? "" : "✓"}
                </Text>
              </View>
              <Text style={styles.prayerName}>{t(prayerLabelKey(p))}</Text>
              <Text style={[styles.prayerStatus, { color: lit ? colors.accent : colors.faint }]}>
                {t(STATUS_LABEL[st])}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionLabel, { writingDirection: dir }]}>{t("prayerTracker.lastSeven")}</Text>
      <View style={styles.legendRow}>
        <Legend color={colors.accent} label={t("prayerTracker.onTime")} colors={colors} />
        <Legend color={LATE} label={t("prayerTracker.late")} colors={colors} />
        <Legend color={colors.border} label={t("prayerTracker.missed")} colors={colors} outline />
        <Legend color={colors.muted} label={t("prayerTracker.paused")} colors={colors} outline />
      </View>
      <View style={styles.grid}>
        {OBLIGATORY_PRAYERS.map((p, pi) => (
          <View key={p} style={styles.gridRow}>
            <Text style={styles.gridLabel}>{t(prayerLabelKey(p))}</Text>
            {days.map((d) => {
              const st = d.statuses[pi] ?? "none";
              const dayPaused = isDatePaused(haid, d.date);
              return (
                <Pressable
                  key={d.date}
                  disabled={dayPaused}
                  onPress={() => cycleDate(d.date, p)}
                  accessibilityLabel={t("prayerTracker.changeStatusAccessibility", {
                    prayer: t(prayerLabelKey(p)),
                    status: dayPaused ? t("prayerTracker.paused") : t(STATUS_LABEL[st]),
                  })}
                  style={[
                    styles.cell,
                    dayPaused
                      ? { borderWidth: 1, borderStyle: "dashed", borderColor: colors.muted }
                      : st === "none"
                        ? { borderWidth: 1, borderColor: colors.border }
                        : { backgroundColor: statusColor(st) },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>

      <Text style={[styles.sectionLabel, { writingDirection: dir }]}>{t("prayerTracker.cyclePause")}</Text>
      <View style={styles.haidCard}>
        <View style={styles.haidInfo}>
          <Text style={[styles.haidStatus, { color: haidCurrent ? colors.accent : colors.fg }]}>
            {haidCurrent ? `${t("prayerTracker.paused")} — ${haidDays}` : t("prayerTracker.trackingActive")}
          </Text>
          <Text style={styles.haidHint}>
            {haidCurrent
              ? t("prayerTracker.pauseActiveHint", { date: haidCurrent.start })
              : t("prayerTracker.pauseHint")}
          </Text>
        </View>
        <Pressable
          onPress={toggleHaid}
          style={[styles.haidBtn, haidCurrent ? styles.haidBtnOutline : null]}
          accessibilityLabel={t(haidCurrent ? "prayerTracker.endPauseAccessibility" : "prayerTracker.startPauseAccessibility")}
        >
          <Text
            style={[styles.haidBtnText, { color: haidCurrent ? colors.fg : colors.accent }]}
          >
            {haidCurrent ? t("prayerTracker.endPause") : t("prayerTracker.startPause")}
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionLabel, { writingDirection: dir }]}>{t("prayerTracker.makeupPrayers", { count: totalOwed(qada) })}</Text>
      <View style={styles.qadaList}>
        {OBLIGATORY_PRAYERS.map((p) => {
          const owed = owedFor(qada, p);
          return (
            <View key={p} style={styles.qadaRow}>
              <Text style={styles.qadaName}>{t(prayerLabelKey(p))}</Text>
              <View style={styles.qadaCtrls}>
                <Pressable
                  style={[styles.step, owed === 0 && styles.stepDisabled]}
                  disabled={owed === 0}
                  onPress={() => adjustQadaFor(p, -1)}
                  accessibilityLabel={t("prayerTracker.makeupOneAccessibility", { prayer: t(prayerLabelKey(p)) })}
                >
                  <Text style={styles.stepMark}>−</Text>
                </Pressable>
                <Text style={[styles.qadaCount, { color: owed ? colors.accent : colors.faint }]}>
                  {owed}
                </Text>
                <Pressable
                  style={styles.step}
                  onPress={() => adjustQadaFor(p, 1)}
                  accessibilityLabel={t("prayerTracker.recordMissedAccessibility", { prayer: t(prayerLabelKey(p)) })}
                >
                  <Text style={styles.stepMark}>+</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>
        {t("prayerTracker.makeupFasts", { count: fastingRemaining })}
      </Text>
      {fastingOwed === 0 ? (
        <Text style={styles.fastingHint}>
          {t("prayerTracker.noMakeupFasts")}
        </Text>
      ) : (
        <View style={styles.qadaList}>
          <View style={styles.qadaRow}>
            <Text style={styles.qadaName}>{t("prayerTracker.ramadanFasts")}</Text>
            <View style={styles.qadaCtrls}>
              <Pressable
                style={[styles.step, fastingRemaining === 0 && styles.stepDisabled]}
                disabled={fastingRemaining === 0}
                onPress={() => adjustFasting(1, fastingOwed)}
                accessibilityLabel={t("prayerTracker.markFastMadeUp")}
              >
                <Text style={styles.stepMark}>−</Text>
              </Pressable>
              <Text style={[styles.qadaCount, { color: fastingRemaining ? colors.accent : colors.faint }]}>
                {fastingRemaining}
              </Text>
              <Pressable
                style={[styles.step, fastingDone === 0 && styles.stepDisabled]}
                disabled={fastingDone === 0}
                onPress={() => adjustFasting(-1, fastingOwed)}
                accessibilityLabel={t("prayerTracker.undoFastMadeUp")}
              >
                <Text style={styles.stepMark}>+</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.fastingHint}>
            {t("prayerTracker.fastsMadeUp", { done: fastingDone, total: fastingOwed })}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ value, label, colors }: { value: string; label: string; colors: Palette }) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Legend({
  color,
  label,
  colors,
  outline,
}: {
  color: string;
  label: string;
  colors: Palette;
  outline?: boolean;
}) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.legend}>
      <View
        style={[
          styles.legendSwatch,
          outline ? { borderWidth: 1, borderColor: color } : { backgroundColor: color },
        ]}
      />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    screen: { padding: 16, backgroundColor: c.bg, gap: 12, flexGrow: 1 },
    statsRow: { flexDirection: "row", gap: 12 },
    stat: {
      flex: 1,
      backgroundColor: c.bgElev,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      padding: 15,
    },
    statValue: { color: c.accent, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
    statLabel: { color: c.faint, fontSize: 12.5, marginTop: 3 },
    sectionLabel: {
      color: c.faint,
      fontSize: 12,
      letterSpacing: 1,
      textTransform: "uppercase",
      fontWeight: "700",
      marginTop: 10,
    },
    todayRow: { flexDirection: "row", gap: 7 },
    prayer: {
      flex: 1,
      alignItems: "center",
      gap: 7,
      paddingVertical: 14,
      paddingHorizontal: 2,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    dot: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
    dotMark: { fontSize: 15, fontWeight: "800" },
    prayerName: { color: c.fg, fontSize: 12.5, fontWeight: "700" },
    prayerStatus: { fontSize: 10.5, fontWeight: "600" },
    legendRow: { flexDirection: "row", gap: 16 },
    legend: { flexDirection: "row", alignItems: "center", gap: 5 },
    legendSwatch: { width: 10, height: 10, borderRadius: 3 },
    legendText: { color: c.faint, fontSize: 11.5 },
    grid: { gap: 8 },
    gridRow: { flexDirection: "row", alignItems: "center", gap: 7 },
    gridLabel: { color: c.muted, fontSize: 12.5, fontWeight: "600", width: 56 },
    cell: { flex: 1, aspectRatio: 1, maxWidth: 34, borderRadius: 7 },
    haidCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: c.bgElev,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      padding: 16,
    },
    haidInfo: { flex: 1 },
    haidStatus: { fontSize: 15, fontWeight: "800" },
    haidHint: { color: c.faint, fontSize: 12.5, marginTop: 4 },
    haidBtn: {
      backgroundColor: c.accentSoft,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: "transparent",
    },
    haidBtnOutline: { backgroundColor: "transparent", borderColor: c.border },
    haidBtnText: { fontSize: 14, fontWeight: "700" },
    qadaList: { gap: 8 },
    qadaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    qadaName: { color: c.fg, fontSize: 14, fontWeight: "700" },
    qadaCtrls: { flexDirection: "row", alignItems: "center", gap: 12 },
    step: {
      width: 34,
      height: 34,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    stepDisabled: { backgroundColor: "transparent", opacity: 0.5 },
    stepMark: { color: c.accent, fontSize: 20, fontWeight: "700", lineHeight: 22 },
    qadaCount: { minWidth: 26, textAlign: "center", fontSize: 16, fontWeight: "800" },
    fastingHint: { color: c.faint, fontSize: 12.5, marginTop: 6 },
  });
}
