import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Switch, Text, View } from "../Type";
import { Icon, type Palette } from "@ummahlibrary/ui";
import { type UpcomingSunnahFast, upcomingSunnahFasts } from "@ummahlibrary/core";
import { useTheme } from "../theme";
import { FONT } from "../fonts";
import { expoNotifier } from "../notifier";
import { readSunnahFastReminderOn, setSunnahFastReminderOn } from "../sunnah-fast-reminders";
import { useI18n } from "../i18n/I18nProvider";

const GLYPH: Record<UpcomingSunnahFast["kind"], string> = {
  "white-day": "🌕",
  monday: "🌙",
  thursday: "🌙",
};

function todayGregorian() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function countdownLabel(daysUntil: number, t: ReturnType<typeof useI18n>["t"]): string {
  if (daysUntil === 0) return t("sunnahReminders.today");
  if (daysUntil === 1) return t("sunnahReminders.tomorrow");
  return t("sunnahReminders.inDays", { count: daysUntil });
}

function gregorianFull(g: { year: number; month: number; day: number }, locale: "ar" | "en"): string {
  return new Date(Date.UTC(g.year, g.month - 1, g.day)).toLocaleDateString(locale === "ar" ? "ar" : undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Opt-in reminder for the recommended (Sunnah) fasting days — Mondays &
 * Thursdays and the white days (Ayyām al-Bīḍ) — with the coming fasts listed.
 * The reminder fires the evening before; delivery is the OS scheduler. Needs no
 * location: the dates are pure Hijri/weekday arithmetic.
 */
export function SunnahFastReminderToggle({ adjust = 0 }: { adjust?: number }) {
  const { locale, t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void readSunnahFastReminderOn().then((o) => {
      setOn(o);
      setReady(true);
    });
  }, []);

  const fasts = useMemo<UpcomingSunnahFast[]>(
    () => upcomingSunnahFasts(todayGregorian(), 6, adjust),
    [adjust],
  );
  const next = fasts[0];

  async function toggle(nextOn: boolean) {
    // Turning on requires the OS permission — if the user denies it, leave the
    // switch off rather than showing "on" for a reminder that will never fire.
    if (nextOn && expoNotifier.permission() !== "granted") {
      await expoNotifier.requestPermission();
      if (expoNotifier.permission() !== "granted") return;
    }
    setOn(nextOn);
    await setSunnahFastReminderOn(nextOn);
  }

  if (!ready) return null;

  return (
    <View>
      <View style={styles.card}>
        <View style={styles.row}>
          <Icon name="bell" size={17} color={on ? colors.accent : colors.muted} sw={1.8} />
          <View style={styles.text}>
            <Text style={styles.title}>{t("sunnahReminders.title")}</Text>
            <Text style={styles.note}>
              {t("sunnahReminders.note")}
            </Text>
          </View>
          <Switch
            value={on}
            onValueChange={(v) => void toggle(v)}
            trackColor={{ true: colors.accentSoft, false: colors.border }}
            thumbColor={on ? colors.accent : colors.faint}
          />
        </View>
        {on && next && (
          <Text style={styles.nextLine}>
            {t("sunnahReminders.next", { name: locale === "ar" ? t(fastNameKey(next.kind)) : next.name, countdown: countdownLabel(next.daysUntil, t) })}
          </Text>
        )}
      </View>

      <Text style={styles.sectionLabel}>{t("sunnahReminders.upcoming")}</Text>
      <View style={styles.list}>
        {fasts.map((f) => (
          <View
            key={`${f.gregorian.year}-${f.gregorian.month}-${f.gregorian.day}`}
            style={[styles.fastRow, f === next && styles.fastRowNext]}
          >
            <View style={styles.badge}>
              <Text style={styles.badgeGlyph}>{GLYPH[f.kind]}</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.fastName}>{locale === "ar" ? t(fastNameKey(f.kind)) : f.name}</Text>
              {locale === "en" && <Text style={styles.fastDate}>{gregorianFull(f.gregorian, locale)} · {f.note}</Text>}
            </View>
            <Text style={styles.countdown}>{countdownLabel(f.daysUntil, t)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function fastNameKey(kind: UpcomingSunnahFast["kind"]) {
  const keys = {
    monday: "sunnahReminders.monday",
    thursday: "sunnahReminders.thursday",
    "white-day": "sunnahReminders.whiteDays",
  } as const;
  return keys[kind];
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    flex1: { flex: 1, minWidth: 0 },
    card: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      padding: 14,
      backgroundColor: c.bgElev,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    text: { flex: 1 },
    title: { color: c.fg, fontFamily: FONT.semibold, fontSize: 14 },
    note: { color: c.muted, fontFamily: FONT.regular, fontSize: 12.5, marginTop: 2 },
    nextLine: { color: c.accent, fontFamily: FONT.semibold, fontSize: 12.5, marginTop: 10 },
    sectionLabel: {
      color: c.faint,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1,
      textTransform: "uppercase",
      marginTop: 22,
      marginBottom: 10,
    },
    list: { gap: 10 },
    fastRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: c.bgElev,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    fastRowNext: { borderColor: c.accent },
    badge: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeGlyph: { fontSize: 18 },
    fastName: { color: c.fg, fontSize: 15, fontWeight: "700" },
    fastDate: { color: c.faint, fontSize: 12, marginTop: 1 },
    countdown: { color: c.accent, fontSize: 13, fontWeight: "700" },
  });
}
