import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import {
  clampDay,
  defaultDateOnlyParts,
  formatDateOnly,
  parseDateOnly,
  daysInMonth,
  type DateOnlyParts,
} from '../utils/dateOnly';

const ITEM_H = 44;
const VISIBLE = 5;
const PAD = ((VISIBLE - 1) / 2) * ITEM_H;
const APP_MAX_W = 500;
const MIN_YEAR = 1920;

type Props = {
  visible: boolean;
  value: string;
  onClose: () => void;
  onConfirm: (isoDate: string) => void;
};

function monthLabels(lang: 'vi' | 'en'): string[] {
  if (lang === 'vi') {
    return Array.from({ length: 12 }, (_, i) => `Tháng ${i + 1}`);
  }
  return [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
}

function WheelColumn({
  items,
  selectedIndex,
  onSelect,
  label,
}: {
  items: { key: string; label: string }[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  label: string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const scrolling = useRef(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [selectedIndex, items.length]);

  const snapTo = (y: number) => {
    const index = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_H)));
    scrollRef.current?.scrollTo({ y: index * ITEM_H, animated: true });
    if (index !== selectedIndex) onSelect(index);
  };

  return (
    <View style={styles.column}>
      <Text style={styles.columnLabel}>{label}</Text>
      <View style={styles.wheelWrap}>
        <View pointerEvents="none" style={styles.selectionBand} />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_H}
          decelerationRate="fast"
          nestedScrollEnabled
          onScrollBeginDrag={() => { scrolling.current = true; }}
          onMomentumScrollEnd={(e) => {
            scrolling.current = false;
            snapTo(e.nativeEvent.contentOffset.y);
          }}
          onScrollEndDrag={(e) => {
            if (!scrolling.current) snapTo(e.nativeEvent.contentOffset.y);
          }}
          contentContainerStyle={{ paddingVertical: PAD }}
          style={styles.wheel}
        >
          {items.map((item, index) => {
            const active = index === selectedIndex;
            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.7}
                onPress={() => {
                  scrollRef.current?.scrollTo({ y: index * ITEM_H, animated: true });
                  onSelect(index);
                }}
                style={styles.wheelItem}
              >
                <Text style={[styles.wheelText, active && styles.wheelTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

export default function DateOfBirthPicker({ visible, value, onClose, onConfirm }: Props) {
  const { t, lang } = useI18n();
  const maxYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: maxYear - MIN_YEAR + 1 }, (_, i) => maxYear - i),
    [maxYear],
  );
  const months = useMemo(() => monthLabels(lang), [lang]);

  const [parts, setParts] = useState<DateOnlyParts>(() =>
    parseDateOnly(value) ?? defaultDateOnlyParts(2000),
  );

  useEffect(() => {
    if (!visible) return;
    setParts(parseDateOnly(value) ?? defaultDateOnlyParts(2000));
  }, [visible, value]);

  const dayCount = daysInMonth(parts.year, parts.month);
  const days = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => i + 1),
    [dayCount],
  );

  const setDay = (day: number) => setParts((p) => ({ ...p, day: clampDay(p.year, p.month, day) }));
  const setMonth = (month: number) =>
    setParts((p) => ({ ...p, month, day: clampDay(p.year, month, p.day) }));
  const setYear = (year: number) =>
    setParts((p) => ({ ...p, year, day: clampDay(year, p.month, p.day) }));

  const preview = formatDateOnly(parts.year, parts.month, parts.day);
  const previewDisplay =
    lang === 'vi'
      ? `${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}/${parts.year}`
      : `${String(parts.month).padStart(2, '0')}/${String(parts.day).padStart(2, '0')}/${parts.year}`;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.shell}>
          <View style={styles.card}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>{t('auth.dateOfBirth')}</Text>
                <Text style={styles.preview}>{previewDisplay}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={10}>
                <Ionicons name="close" size={20} color={Colors.textDark} />
              </TouchableOpacity>
            </View>

            <View style={styles.wheels}>
              <WheelColumn
                label={t('auth.day')}
                items={days.map((d) => ({ key: `d-${d}`, label: String(d).padStart(2, '0') }))}
                selectedIndex={Math.min(parts.day, dayCount) - 1}
                onSelect={(i) => setDay(i + 1)}
              />
              <WheelColumn
                label={t('auth.month')}
                items={months.map((m, i) => ({ key: `m-${i + 1}`, label: m }))}
                selectedIndex={parts.month - 1}
                onSelect={(i) => setMonth(i + 1)}
              />
              <WheelColumn
                label={t('auth.year')}
                items={years.map((y) => ({ key: `y-${y}`, label: String(y) }))}
                selectedIndex={Math.max(0, years.indexOf(parts.year))}
                onSelect={(i) => setYear(years[i])}
              />
            </View>

            <View style={styles.actions}>
              <TouchableOpacity onPress={onClose} style={[styles.btn, styles.btnGhost]} activeOpacity={0.85}>
                <Text style={styles.btnGhostText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onConfirm(preview);
                  onClose();
                }}
                style={[styles.btn, styles.btnPrimary]}
                activeOpacity={0.85}
              >
                <Text style={styles.btnPrimaryText}>{t('common.done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  shell: {
    width: '100%',
    maxWidth: APP_MAX_W,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 18,
    ...Shadows.float,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
  },
  preview: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: Colors.primary,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheels: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  column: {
    flex: 1,
  },
  columnLabel: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  wheelWrap: {
    height: ITEM_H * VISIBLE,
    borderRadius: 16,
    backgroundColor: Colors.primaryTint,
    overflow: 'hidden',
  },
  selectionBand: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: PAD,
    height: ITEM_H,
    borderRadius: 12,
    backgroundColor: Colors.white,
    zIndex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  wheel: {
    zIndex: 2,
  },
  wheelItem: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  wheelText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  wheelTextActive: {
    color: Colors.textDark,
    fontWeight: '800',
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnGhost: {
    backgroundColor: Colors.primaryTint,
  },
  btnGhostText: {
    color: Colors.textMid,
    fontWeight: '700',
    fontSize: 14,
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
  },
  btnPrimaryText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
