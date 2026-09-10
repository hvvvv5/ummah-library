/**
 * "Sync across devices" settings section (#25, ADR 0033) — the mobile counterpart
 * of the web `SyncSettings`. Sets up or manages opt-in, end-to-end-encrypted sync:
 * generate or enter a recovery phrase, turn sync on/off, reveal/copy the phrase,
 * and sync on demand. The phrase is the only key — losing it means the synced data
 * can't be recovered, which the section states plainly.
 */
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "../Type";
import { setStringAsync } from "expo-clipboard";
import type { SyncOutcome } from "@ummahlibrary/core";
import { useTheme, type Palette } from "../theme";
import { FONT } from "../fonts";
import { generateRecoveryPhrase } from "../lib/sync/noble-cipher";
import {
  disableSync,
  enableSync,
  isSyncEnabled,
  readSyncSecret,
} from "../lib/sync/sync-settings";
import { resetSyncRuntime, syncIfEnabled } from "../lib/sync/sync-runtime";
import { useT } from "../i18n/I18nProvider";

function outcomeMessage(outcome: SyncOutcome | null, t: ReturnType<typeof useT>): string {
  if (!outcome) return t("sync.off");
  if (outcome.applied === 0) return t("sync.upToDate");
  const n = outcome.applied;
  return n === 1 ? t("sync.syncedOne", { count: n }) : t("sync.syncedMany", { count: n });
}

export function SyncSection() {
  const t = useT();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [enabled, setEnabled] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [phrase, setPhrase] = useState("");
  const [reveal, setReveal] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([isSyncEnabled(), readSyncSecret()]).then(([on, s]) => {
      setEnabled(on);
      setSecret(s);
    });
  }, []);

  async function turnOn() {
    const s = phrase.trim();
    if (!s) return;
    setBusy(true);
    setStatus(null);
    await enableSync(s);
    resetSyncRuntime();
    setEnabled(true);
    setSecret(s);
    try {
      setStatus({ ok: true, message: outcomeMessage(await syncIfEnabled(), t) });
    } catch {
      setStatus({ ok: false, message: t("sync.serverDown") });
    } finally {
      setBusy(false);
      setPhrase("");
    }
  }

  async function syncNow() {
    setBusy(true);
    setStatus(null);
    try {
      setStatus({ ok: true, message: outcomeMessage(await syncIfEnabled(), t) });
    } catch {
      setStatus({ ok: false, message: t("sync.serverDown") });
    } finally {
      setBusy(false);
    }
  }

  function turnOff() {
    Alert.alert(
      t("sync.turnOffTitle"), t("sync.turnOffBody"),
      [
        { text: t("sync.cancel"), style: "cancel" },
        {
          text: t("sync.turnOff"),
          style: "destructive",
          onPress: () => {
            void disableSync();
            resetSyncRuntime();
            setEnabled(false);
            setSecret(null);
            setReveal(false);
            setStatus(null);
          },
        },
      ],
    );
  }

  function copyPhrase() {
    if (secret) void setStringAsync(secret).catch(() => {});
  }

  return (
    <View>
      <Text style={styles.sectionLabel}>{t("sync.title")}</Text>
      <Text style={styles.intro}>
        {t("sync.intro")}
      </Text>

      {enabled ? (
        <View style={styles.card}>
          <Text style={styles.cardBody}>
            {t("sync.enabledBody")}
          </Text>
          <View style={styles.btnRow}>
            <Pressable
              style={[styles.primaryBtn, busy && styles.dim]}
              disabled={busy}
              onPress={() => void syncNow()}
            >
              {busy ? (
                <ActivityIndicator color={colors.ink} size="small" />
              ) : (
                <Text style={styles.primaryText}>{t("sync.syncNow")}</Text>
              )}
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => setReveal((r) => !r)}>
              <Text style={styles.secondaryText}>{reveal ? t("sync.hidePhrase") : t("sync.showPhrase")}</Text>
            </Pressable>
          </View>
          {reveal && secret && (
            <View style={styles.phraseBox}>
              <Text style={styles.phraseText} selectable>
                {secret}
              </Text>
              <Pressable style={styles.copyBtn} onPress={copyPhrase}>
                <Text style={styles.secondaryText}>{t("sync.copy")}</Text>
              </Pressable>
            </View>
          )}
          <Pressable style={styles.dangerBtn} onPress={turnOff}>
            <Text style={styles.dangerText}>{t("sync.turnOff")}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardBody}>
            {t("sync.setupBody")}
          </Text>
          <TextInput
            value={phrase}
            onChangeText={setPhrase}
            placeholder={t("sync.placeholder")}
            placeholderTextColor={colors.faint}
            autoCapitalize="characters"
            autoCorrect={false}
            spellCheck={false}
            style={styles.input}
          />
          <View style={styles.btnRow}>
            <Pressable style={styles.secondaryBtn} onPress={() => setPhrase(generateRecoveryPhrase())}>
              <Text style={styles.secondaryText}>{t("sync.generate")}</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, (!phrase.trim() || busy) && styles.dim]}
              disabled={!phrase.trim() || busy}
              onPress={() => void turnOn()}
            >
              {busy ? (
                <ActivityIndicator color={colors.ink} size="small" />
              ) : (
                <Text style={styles.primaryText}>{t("sync.turnOn")}</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {status && (
        <Text style={[styles.status, { color: status.ok ? colors.accent : colors.error }]}>
          {status.message}
        </Text>
      )}

      <View style={styles.warnCard}>
        <Text style={styles.warnText}>
          {t("sync.warning")}
        </Text>
      </View>
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    sectionLabel: {
      color: c.faint,
      fontSize: 12,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      fontFamily: FONT.bold,
      marginTop: 22,
      marginBottom: 11,
    },
    intro: { color: c.muted, fontSize: 14, lineHeight: 21, marginBottom: 14 },
    card: {
      backgroundColor: c.bgElev,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      padding: 16,
    },
    cardBody: { color: c.muted, fontSize: 13.5, lineHeight: 20, marginBottom: 14 },
    btnRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" },
    primaryBtn: {
      backgroundColor: c.accent,
      borderRadius: 11,
      paddingVertical: 11,
      paddingHorizontal: 20,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 120,
    },
    primaryText: { color: c.ink, fontSize: 14.5, fontFamily: FONT.bold },
    secondaryBtn: {
      backgroundColor: c.cardHi,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 11,
      paddingVertical: 11,
      paddingHorizontal: 16,
      alignItems: "center",
    },
    secondaryText: { color: c.fg, fontSize: 14, fontFamily: FONT.semibold },
    dangerBtn: { marginTop: 14, alignSelf: "flex-start", paddingVertical: 4 },
    dangerText: { color: c.error, fontSize: 14, fontFamily: FONT.semibold },
    dim: { opacity: 0.5 },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bg,
      borderRadius: 11,
      paddingVertical: 10,
      paddingHorizontal: 12,
      color: c.fg,
      fontSize: 15,
      letterSpacing: 1,
      marginBottom: 12,
    },
    phraseBox: {
      marginTop: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
    },
    phraseText: {
      flex: 1,
      minWidth: 160,
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      color: c.fg,
      fontSize: 14,
      letterSpacing: 1,
    },
    copyBtn: {
      backgroundColor: c.cardHi,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    status: { fontSize: 13.5, lineHeight: 20, marginTop: 12, fontFamily: FONT.medium },
    warnCard: { marginTop: 14, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14 },
    warnText: { color: c.faint, fontSize: 12.5, lineHeight: 19 },
  });
}
