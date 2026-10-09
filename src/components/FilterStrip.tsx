import React, { useEffect, useRef } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BEAUTY_FILTERS, type BeautyFilterId } from '../constants/beautyFilters';
import { useI18n } from '../i18n';

type FilterStripProps = {
  selectedId: BeautyFilterId;
  onSelect: (id: BeautyFilterId) => void;
};

type Scrollable = HTMLElement & {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
};

function scrollableNode(ref: ScrollView | null): Scrollable | null {
  const node = (ref as unknown as { getScrollableNode?: () => Scrollable } | null)?.getScrollableNode?.();
  return node ?? null;
}

export default function FilterStrip({ selectedId, onSelect }: FilterStripProps) {
  const { t } = useI18n();
  const scrollerRef = useRef<ScrollView>(null);
  const dragged = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = scrollableNode(scrollerRef.current);
    if (!node) return;

    node.style.overflowX = 'auto';
    node.style.overflowY = 'hidden';
    node.style.touchAction = 'pan-x';
    node.style.cursor = 'grab';
    node.style.maxWidth = '100%';

    let active = false;
    let axis: 'x' | 'y' | null = null;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;

    const finish = () => {
      active = false;
      axis = null;
      node.style.cursor = 'grab';
      window.setTimeout(() => {
        dragged.current = false;
      }, 80);
    };

    const onWheel = (event: WheelEvent) => {
      const max = node.scrollWidth - node.clientWidth;
      if (max <= 0) return;
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      const delta = horizontal ? event.deltaX : event.deltaY;
      const atStart = node.scrollLeft <= 0 && delta < 0;
      const atEnd = node.scrollLeft >= max - 1 && delta > 0;
      if (!horizontal && (atStart || atEnd)) return;
      event.preventDefault();
      event.stopPropagation();
      node.scrollLeft = Math.max(0, Math.min(max, node.scrollLeft + delta));
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      active = true;
      axis = null;
      dragged.current = false;
      startX = event.clientX;
      startY = event.clientY;
      startLeft = node.scrollLeft;
    };

    const moveBy = (clientX: number, clientY: number) => {
      const dx = clientX - startX;
      const dy = clientY - startY;
      if (!axis) {
        if (Math.hypot(dx, dy) < 6) return;
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (axis === 'x') node.style.cursor = 'grabbing';
      }
      if (axis !== 'x') return;
      dragged.current = true;
      const max = node.scrollWidth - node.clientWidth;
      node.scrollLeft = Math.max(0, Math.min(max, startLeft - dx));
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!active || event.pointerType === 'touch') return;
      moveBy(event.clientX, event.clientY);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!active) return;
      const touch = event.touches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (!axis && Math.hypot(dx, dy) >= 6) {
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if (axis !== 'x') return;
      event.preventDefault();
      moveBy(touch.clientX, touch.clientY);
    };

    const onClickCapture = (event: MouseEvent) => {
      if (!dragged.current) return;
      event.preventDefault();
      event.stopPropagation();
      dragged.current = false;
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    node.addEventListener('pointerdown', onPointerDown);
    node.addEventListener('touchmove', onTouchMove, { passive: false });
    node.addEventListener('click', onClickCapture, true);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);

    return () => {
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
  }, []);

  return (
    <ScrollView
      ref={scrollerRef}
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
      contentContainerStyle={styles.row}
      onScrollBeginDrag={() => {
        dragged.current = true;
      }}
      onScrollEndDrag={() => {
        setTimeout(() => {
          dragged.current = false;
        }, 60);
      }}
    >
      {BEAUTY_FILTERS.map(filter => {
        const active = selectedId === filter.id;
        return (
          <TouchableOpacity
            key={filter.id}
            activeOpacity={0.88}
            onPress={() => {
              if (dragged.current) return;
              onSelect(filter.id);
            }}
            style={[styles.chip, active && styles.chipActive]}
          >
            <View style={[styles.swatch, { backgroundColor: filter.swatch }]}>
              <Text style={styles.emoji}>{filter.emoji}</Text>
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{t(filter.labelKey)}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: {
    width: '100%',
    maxWidth: '100%',
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 14,
    paddingHorizontal: 4,
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    flexShrink: 0,
  },
  chipActive: {
    backgroundColor: 'rgba(156,124,255,0.45)',
    borderColor: 'rgba(255,255,255,0.55)',
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '700',
  },
  labelActive: {
    color: '#FFFFFF',
  },
});
