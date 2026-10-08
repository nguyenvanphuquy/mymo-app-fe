import React, { useEffect, useRef } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Colors, Shadows } from '../constants/colors';
import { VIBES, type VibeId } from '../constants/vibes';

interface VibeStripProps {
  selectedId: VibeId;
  onSelect: (id: VibeId) => void;
}

type Scrollable = HTMLElement & {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
};

function scrollableNode(ref: ScrollView | null): Scrollable | null {
  const node = (ref as unknown as { getScrollableNode?: () => Scrollable } | null)?.getScrollableNode?.();
  return node ?? null;
}

export default function VibeStrip({ selectedId, onSelect }: VibeStripProps) {
  const scrollerRef = useRef<ScrollView>(null);
  const dragged = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = scrollableNode(scrollerRef.current);
    if (!node) return;

    let parent: HTMLElement | null = node.parentElement;
    while (parent) {
      const overflowY = getComputedStyle(parent).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        parent.style.overflowX = 'clip';
        break;
      }
      parent = parent.parentElement;
    }

    node.style.touchAction = 'pan-y';
    node.style.cursor = 'grab';

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
      {VIBES.map(vibe => {
        const selected = selectedId === vibe.id;
        return (
          <TouchableOpacity
            key={vibe.id}
            activeOpacity={0.85}
            onPress={() => {
              if (dragged.current) return;
              onSelect(vibe.id);
            }}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? vibe.grad[1] : vibe.grad[0],
                borderColor: selected ? vibe.color : 'rgba(255,255,255,0.95)',
              },
              selected && styles.chipOn,
            ]}
          >
            <Text style={styles.emoji}>{vibe.emoji}</Text>
            <Text style={[styles.name, { color: vibe.color }]}>{vibe.name}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: {
    marginHorizontal: -20,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipOn: {
    borderWidth: 1.5,
    ...Shadows.soft,
  },
  emoji: {
    fontSize: 14,
  },
  name: {
    fontSize: 13,
    fontWeight: '800',
  },
});
