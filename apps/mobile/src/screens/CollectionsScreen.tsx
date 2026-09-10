import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "../Type";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ayahKey,
  deleteCollection,
  renameCollection,
  toggleAyah,
} from "@ummahlibrary/core";
import { Khatam, Icon } from "@ummahlibrary/ui";
import { api } from "../api";
import { FONT } from "../fonts";
import { DEFAULT_EDITION } from "../types";
import { useTheme, type Palette } from "../theme";
import { useLibrary, newCollectionId } from "../state/LibraryContext";
import type { MoreStackParamList } from "../navigation/types";
import { useI18n } from "../i18n/I18nProvider";

type Props = NativeStackScreenProps<MoreStackParamList, "Collections">;

interface AyahText {
  ar: string;
  tr: string | null;
}

export function CollectionsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { dir, t } = useI18n();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { collections, notes, updateCollections } = useLibrary();
  const [names, setNames] = useState<Record<number, string>>({});
  const [texts, setTexts] = useState<Record<string, AyahText>>({});
  const fetched = useRef<Set<number>>(new Set());

  // Surah names for friendly labels (e.g. "Al-Baqarah · 2:255").
  useEffect(() => {
    let active = true;
    void api
      .listSurahs()
      .then((s) => active && setNames(Object.fromEntries(s.map((x) => [x.number, x.transliteration]))))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // The distinct surahs referenced by any saved āyah.
  const surahsNeeded = useMemo(() => {
    const set = new Set<number>();
    for (const c of collections) for (const r of c.ayahs) set.add(r.sura);
    return [...set];
  }, [collections]);

  // Fetch the Arabic + default translation for each referenced surah, so a
  // bookmark reads as the verse itself rather than a bare reference.
  useEffect(() => {
    let active = true;
    const todo = surahsNeeded.filter((s) => !fetched.current.has(s));
    if (todo.length === 0) return;
    todo.forEach((s) => fetched.current.add(s));
    void Promise.all(
      todo.map(async (s) => {
        const [surahData, trRows] = await Promise.all([
          api.getSurah(s).catch(() => null),
          api.getCatalogTranslation(DEFAULT_EDITION, s).catch(() => []),
        ]);
        const trMap = new Map(trRows.map((r) => [r.aya, r.text]));
        const out: Record<string, AyahText> = {};
        for (const a of surahData?.ayahs ?? []) {
          out[`${s}:${a.aya}`] = { ar: a.text, tr: trMap.get(a.aya) ?? null };
        }
        return out;
      }),
    ).then((parts) => {
      if (active) setTexts((prev) => Object.assign({}, prev, ...parts));
    });
    return () => {
      active = false;
    };
  }, [surahsNeeded]);

  function addCollection() {
    updateCollections([
      ...collections,
      { id: newCollectionId(), name: t("collections.defaultName", { number: collections.length + 1 }), ayahs: [] },
    ]);
  }

  function confirmDelete(id: string, name: string) {
    Alert.alert(t("collections.deleteTitle"), t("collections.deleteBody", { name }), [
      { text: t("settings.cancel"), style: "cancel" },
      { text: t("collections.delete"), style: "destructive", onPress: () => updateCollections(deleteCollection(collections, id)) },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <View style={styles.head}>
        <Text style={[styles.h1, { writingDirection: dir }]}>{t("nav.bookmarks")}</Text>
        <Pressable style={styles.newBtn} onPress={addCollection}>
          <Text style={[styles.newText, { writingDirection: dir }]}>{t("collections.new")}</Text>
        </Pressable>
      </View>
      <Text style={[styles.subtitle, { writingDirection: dir }]}>{t("collections.subtitle")}</Text>

      {collections.length === 0 ? (
        <View style={styles.empty}>
          <Khatam size={64} color={colors.accent} sw={1.2} opacity={0.5} />
          <Text style={[styles.emptyTitle, { writingDirection: dir }]}>{t("collections.emptyTitle")}</Text>
          <Text style={[styles.emptyBody, { writingDirection: dir }]}>{t("collections.emptyBody")}</Text>
          <Pressable style={styles.emptyBtn} onPress={addCollection}>
            <Text style={[styles.emptyBtnText, { writingDirection: dir }]}>{t("collections.create")}</Text>
          </Pressable>
        </View>
      ) : (
        collections.map((c) => (
          <View key={c.id} style={styles.collection}>
            <View style={styles.collHead}>
              <TextInput
                style={styles.collName}
                value={c.name}
                onChangeText={(t) => updateCollections(renameCollection(collections, c.id, t))}
              />
              <Text style={styles.collCount}>{c.ayahs.length}</Text>
              <Pressable onPress={() => confirmDelete(c.id, c.name)} hitSlop={8}>
                <Text style={[styles.delete, { writingDirection: dir }]}>{t("collections.delete")}</Text>
              </Pressable>
            </View>

            {c.ayahs.length === 0 ? (
              <Text style={[styles.muted, { writingDirection: dir }]}>{t("collections.empty")}</Text>
            ) : (
              c.ayahs.map((ref) => {
                const key = ayahKey(ref);
                const text = texts[key];
                const note = notes[key];
                const label = names[ref.sura] ? `${names[ref.sura]} · ${key}` : key;
                return (
                  <View key={key} style={styles.card}>
                    <View style={styles.cardHead}>
                      <Text style={styles.ref}>{label}</Text>
                      <Pressable
                        onPress={() => updateCollections(toggleAyah(collections, c.id, ref))}
                        hitSlop={8}
                        accessibilityLabel={t("collections.remove", { reference: key })}
                      >
                        <Text style={styles.remove}>✕</Text>
                      </Pressable>
                    </View>

                    {!text ? (
                      <ActivityIndicator color={colors.accent} style={styles.loading} />
                    ) : (
                      <>
                        {text.ar ? <Text style={styles.arabic}>{text.ar}</Text> : null}
                        {text.tr ? <Text style={styles.translation}>{text.tr}</Text> : null}
                      </>
                    )}

                    {note ? <Text style={styles.note}>{note}</Text> : null}

                    <Pressable
                      style={styles.open}
                      onPress={() =>
                        navigation
                          .getParent()
                          ?.navigate("Read", { screen: "SurahReader", params: { surah: ref.sura } } as never)
                      }
                    >
                      <Text style={[styles.openText, { writingDirection: dir }]}>{t("collections.openReader")}</Text>
                      <Icon name="arrowR" size={15} color={colors.accent} sw={1.8} />
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    screen: { padding: 18, backgroundColor: c.bg, gap: 8, flexGrow: 1 },
    head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    h1: { color: c.fg, fontSize: 26, fontWeight: "800" },
    newBtn: {
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.accent,
      backgroundColor: c.accentSoft,
    },
    newText: { color: c.accent, fontSize: 14, fontWeight: "700" },
    subtitle: { color: c.muted, fontSize: 14, marginBottom: 10 },
    empty: { alignItems: "center", paddingVertical: 44, gap: 14 },
    emptyTitle: { color: c.fg, fontSize: 18, fontWeight: "700" },
    emptyBody: { color: c.muted, fontSize: 14.5, lineHeight: 23, textAlign: "center", maxWidth: 360 },
    accentInline: { color: c.accent, fontWeight: "700" },
    emptyBtn: {
      marginTop: 6,
      paddingVertical: 11,
      paddingHorizontal: 20,
      borderRadius: 11,
      backgroundColor: c.accent,
    },
    emptyBtnText: { color: c.ink, fontSize: 14.5, fontWeight: "700" },
    collection: {
      backgroundColor: c.bgElev,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      padding: 14,
      marginTop: 10,
      gap: 10,
    },
    collHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 },
    collName: { flex: 1, color: c.fg, fontSize: 16, fontWeight: "700", paddingVertical: 2 },
    collCount: {
      color: c.accent,
      fontSize: 12.5,
      fontWeight: "700",
      backgroundColor: c.accentSoft,
      borderRadius: 999,
      paddingVertical: 2,
      paddingHorizontal: 9,
      overflow: "hidden",
    },
    delete: { color: c.faint, fontSize: 13 },
    muted: { color: c.muted, fontSize: 13.5, paddingVertical: 4 },
    card: {
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 14,
      gap: 8,
    },
    cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    ref: { color: c.accent, fontSize: 13, fontFamily: FONT.bold },
    remove: { color: c.faint, fontSize: 15 },
    loading: { alignSelf: "flex-start", marginVertical: 4 },
    arabic: {
      color: c.fg,
      fontSize: 22,
      lineHeight: 42,
      textAlign: "right",
      writingDirection: "rtl",
      fontFamily: FONT.ar,
    },
    translation: { color: c.muted, fontSize: 14.5, lineHeight: 23 },
    note: {
      color: c.muted,
      fontSize: 13.5,
      lineHeight: 21,
      paddingLeft: 10,
      borderLeftWidth: 2,
      borderLeftColor: c.accent,
    },
    open: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
    openText: { color: c.accent, fontSize: 13, fontFamily: FONT.semibold },
  });
}
