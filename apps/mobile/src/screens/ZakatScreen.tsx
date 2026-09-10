import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, Pressable } from "../Type";
import {
  type NisabBasis,
  ZAKAT_ASSET_CATEGORIES,
  calculateZakat,
} from "@ummahlibrary/core";
import { Khatam } from "@ummahlibrary/ui";
import { KEYS, getJSON, isObjectRecord, setJSON } from "../storage";
import { FONT } from "../fonts";
import { useTheme, type Palette } from "../theme";
import { useI18n } from "../i18n/I18nProvider";

const ASSET_TEXT = {
  cash: { label: "zakat.asset.cash.label", hint: "zakat.asset.cash.hint" },
  gold: { label: "zakat.asset.gold.label", hint: "zakat.asset.gold.hint" },
  silver: { label: "zakat.asset.silver.label", hint: "zakat.asset.silver.hint" },
  investments: { label: "zakat.asset.investments.label", hint: "zakat.asset.investments.hint" },
  business: { label: "zakat.asset.business.label", hint: "zakat.asset.business.hint" },
  receivables: { label: "zakat.asset.receivables.label", hint: "zakat.asset.receivables.hint" },
} as const;

interface ZakatState {
  currency: string;
  goldPricePerGram: string;
  silverPricePerGram: string;
  nisabBasis: NisabBasis;
  assets: Record<string, string>;
  liabilities: string;
}

const EMPTY_ASSETS = Object.fromEntries(ZAKAT_ASSET_CATEGORIES.map((c) => [c.id, ""]));

const DEFAULT: ZakatState = {
  currency: "$",
  goldPricePerGram: "",
  silverPricePerGram: "",
  nisabBasis: "silver",
  assets: { ...EMPTY_ASSETS },
  liabilities: "",
};

function toNum(s: string): number {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** Sanitize free text into a non-negative decimal string: digits and at most one "." */
function sanitizeDecimal(s: string): string {
  const digitsAndDots = s.replace(/[^0-9.]/g, "");
  const firstDot = digitsAndDots.indexOf(".");
  if (firstDot === -1) return digitsAndDots;
  return digitsAndDots.slice(0, firstDot + 1) + digitsAndDots.slice(firstDot + 1).replace(/\./g, "");
}

/** Strip digits from the currency symbol field — a symbol/code ("$", "AED") never
 *  contains one, and allowing digits here let a stray one silently fuse into the
 *  displayed totals (money() concatenates currency + amount with no separator). */
function sanitizeCurrency(s: string): string {
  return s.replace(/[0-9]/g, "");
}

export function ZakatScreen() {
  const { colors } = useTheme();
  const { dir, t } = useI18n();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [state, setState] = useState<ZakatState>(DEFAULT);

  useEffect(() => {
    void getJSON<Partial<ZakatState>>(KEYS.zakat, {}, isObjectRecord).then((saved) => {
      setState({
        ...DEFAULT,
        ...saved,
        // Self-heal a currency value saved before sanitizeCurrency existed —
        // a stray digit in it used to silently fuse into the displayed totals.
        currency: sanitizeCurrency(saved.currency ?? DEFAULT.currency) || DEFAULT.currency,
        assets: { ...EMPTY_ASSETS, ...(saved.assets ?? {}) },
      });
    });
  }, []);

  function update(patch: Partial<ZakatState>) {
    setState((prev) => {
      const next = { ...prev, ...patch };
      void setJSON(KEYS.zakat, next);
      return next;
    });
  }

  function setAsset(id: string, value: string) {
    update({ assets: { ...state.assets, [id]: value } });
  }

  // "Reset amounts" clears what it says — the entered wealth figures — and
  // leaves currency, gold/silver prices, and the niṣāb basis alone; a user
  // recalculating for a new scenario shouldn't lose prices they looked up.
  function reset() {
    update({ assets: { ...EMPTY_ASSETS }, liabilities: "" });
  }

  const result = useMemo(
    () =>
      calculateZakat({
        assets: Object.fromEntries(ZAKAT_ASSET_CATEGORIES.map((c) => [c.id, toNum(state.assets[c.id] ?? "")])),
        liabilities: toNum(state.liabilities),
        nisabBasis: state.nisabBasis,
        goldPricePerGram: toNum(state.goldPricePerGram),
        silverPricePerGram: toNum(state.silverPricePerGram),
      }),
    [state],
  );

  const havePrices =
    state.nisabBasis === "gold"
      ? toNum(state.goldPricePerGram) > 0
      : toNum(state.silverPricePerGram) > 0;
  const basis = t(state.nisabBasis === "silver" ? "zakat.basis.silver" : "zakat.basis.gold");

  function money(n: number) {
    // Sanitize defensively even here — a value written by another route (e.g. a
    // synced payload from another device) could still carry a stray digit, and
    // a bare concatenation would silently fuse it into the total.
    const symbol = sanitizeCurrency(state.currency) || DEFAULT.currency;
    return `${symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.hero}>
          <View style={styles.heroWatermark} pointerEvents="none">
            <Khatam size={150} color={colors.accent} sw={1.1} opacity={0.08} />
          </View>
          <Text style={[styles.heroLabel, { writingDirection: dir }]}>{t("zakat.due")}</Text>
          <Text style={styles.heroValue}>{havePrices ? money(result.zakatDue) : "—"}</Text>
          <Text style={styles.heroNote}>
            {!havePrices
              ? t("zakat.needPrices")
              : result.meetsNisab
                ? t("zakat.aboveNisab", { amount: money(result.netWealth), basis })
                : t("zakat.belowNisab", { amount: money(result.netWealth), basis })}
          </Text>
          <View style={styles.heroDivider} />
          <SummaryItem label={t("zakat.totalAssets")} value={money(result.totalAssets)} colors={colors} />
          <SummaryItem label={t("zakat.netWealth")} value={money(result.netWealth)} colors={colors} strong />
          <SummaryItem
            label={t("zakat.nisab", { basis })}
            value={havePrices ? money(result.nisab) : "—"}
            colors={colors}
          />
        </View>

        <Text style={[styles.disclaimer, { writingDirection: dir }]}>{t("zakat.disclaimer")}</Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { writingDirection: dir }]}>{t("zakat.prices")}</Text>
          <Row label={t("zakat.currency")}>
            <TextInput
              style={styles.input}
              value={state.currency}
              onChangeText={(v) => update({ currency: sanitizeCurrency(v) })}
              maxLength={4}
            />
          </Row>
          <Row label={t("zakat.goldPerGram")}>
            <TextInput
              style={styles.input}
              value={state.goldPricePerGram}
              onChangeText={(v) => update({ goldPricePerGram: sanitizeDecimal(v) })}
              keyboardType="decimal-pad"
              placeholder={t("zakat.example", { value: "75" })}
              placeholderTextColor={colors.muted}
            />
          </Row>
          <Row label={t("zakat.silverPerGram")}>
            <TextInput
              style={styles.input}
              value={state.silverPricePerGram}
              onChangeText={(v) => update({ silverPricePerGram: sanitizeDecimal(v) })}
              keyboardType="decimal-pad"
              placeholder={t("zakat.example", { value: "0.85" })}
              placeholderTextColor={colors.muted}
            />
          </Row>
          <View style={styles.basisRow}>
            <Text style={[styles.label, { writingDirection: dir }]}>{t("zakat.thresholdBasis")}</Text>
            <View style={styles.chips}>
              {(["silver", "gold"] as NisabBasis[]).map((b) => (
                <Pressable
                  key={b}
                  style={[styles.chip, b === state.nisabBasis && styles.chipOn]}
                  onPress={() => update({ nisabBasis: b })}
                >
                  <Text style={[styles.chipText, b === state.nisabBasis && styles.chipTextOn]}>
                    {b === "silver" ? t("zakat.silverLower") : t("zakat.goldHigher")}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { writingDirection: dir }]}>{t("zakat.assets")}</Text>
          {ZAKAT_ASSET_CATEGORIES.map((c) => {
            const copy = ASSET_TEXT[c.id as keyof typeof ASSET_TEXT];
            return (
            <Row key={c.id} label={t(copy.label)} hint={t(copy.hint)}>
              <TextInput
                style={styles.input}
                value={state.assets[c.id] ?? ""}
                onChangeText={(v) => setAsset(c.id, sanitizeDecimal(v))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.muted}
              />
            </Row>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { writingDirection: dir }]}>{t("zakat.deductions")}</Text>
          <Row label={t("zakat.liabilities")} hint={t("zakat.liabilitiesHint")}>
            <TextInput
              style={styles.input}
              value={state.liabilities}
              onChangeText={(v) => update({ liabilities: sanitizeDecimal(v) })}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.muted}
            />
          </Row>
        </View>

        <Pressable style={styles.resetBtn} onPress={reset}>
          <Text style={[styles.resetText, { writingDirection: dir }]}>{t("zakat.reset")}</Text>
        </Pressable>
        <Text style={[styles.foot, { writingDirection: dir }]}>{t("zakat.deviceOnly")}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  const s = useMemo(() => rowStyles(colors), [colors]);
  return (
    <View style={s.row}>
      <View style={s.labelWrap}>
        <Text style={s.label}>{label}</Text>
        {hint && <Text style={s.hint}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

function SummaryItem({
  label,
  value,
  colors,
  strong,
}: {
  label: string;
  value: string;
  colors: Palette;
  strong?: boolean;
}) {
  const s = useMemo(() => summaryStyles(colors), [colors]);
  return (
    <View style={s.item}>
      <Text style={[s.dt, strong && s.dtStrong]}>{label}</Text>
      <Text style={[s.dd, strong && s.ddStrong]}>{value}</Text>
    </View>
  );
}

function rowStyles(c: Palette) {
  return StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 12 },
    labelWrap: { flex: 1, gap: 2 },
    label: { color: c.fg, fontSize: 14 },
    hint: { color: c.muted, fontSize: 11 },
  });
}

function summaryStyles(c: Palette) {
  return StyleSheet.create({
    item: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
    dt: { color: c.muted, fontSize: 14 },
    dtStrong: { color: c.fg, fontFamily: FONT.semibold, fontSize: 15 },
    dd: { color: c.fg, fontSize: 14, fontFamily: FONT.semibold },
    ddStrong: { color: c.fg, fontFamily: FONT.extrabold, fontSize: 15.5 },
  });
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    screen: { padding: 16, backgroundColor: c.bg, gap: 16, paddingBottom: 40 },
    disclaimer: { color: c.muted, fontSize: 12, lineHeight: 18 },
    section: {
      backgroundColor: c.bgElev,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      gap: 4,
    },
    sectionTitle: { color: c.fg, fontSize: 14, fontWeight: "700", marginBottom: 4 },
    input: {
      color: c.fg,
      fontSize: 14,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      minWidth: 100,
      textAlign: "right",
    },
    basisRow: { gap: 6, marginTop: 4 },
    label: { color: c.muted, fontSize: 12, fontWeight: "600" },
    chips: { flexDirection: "row", gap: 8 },
    chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: c.border },
    chipOn: { borderColor: c.accent, backgroundColor: c.accentSoft },
    chipText: { color: c.muted, fontSize: 13 },
    chipTextOn: { color: c.accent, fontWeight: "600" },
    hero: {
      backgroundColor: c.bgElev,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      padding: 22,
      overflow: "hidden",
    },
    heroWatermark: { position: "absolute", right: -34, bottom: -40 },
    heroLabel: {
      color: c.faint,
      fontSize: 11,
      letterSpacing: 1,
      textTransform: "uppercase",
      fontFamily: FONT.bold,
    },
    heroValue: { color: c.accent, fontSize: 44, fontFamily: FONT.extrabold, letterSpacing: -1.5, marginVertical: 6 },
    heroNote: { color: c.muted, fontSize: 13.5, lineHeight: 19 },
    heroDivider: { height: 1, backgroundColor: c.borderSoft, marginVertical: 16 },
    resetBtn: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border, alignItems: "center" },
    resetText: { color: c.fg, fontSize: 14 },
    foot: { color: c.muted, fontSize: 11, textAlign: "center" },
  });
}
