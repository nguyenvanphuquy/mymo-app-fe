import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VIBES, type VibeId } from '../constants/vibes';
import { Colors, Shadows } from '../constants/colors';

interface VibeGalleryProps {
  selectedId?: string | null;
  selectedIds?: readonly string[];
  lang?: string;
  onSelect: (id: VibeId) => void;
}

export default function VibeGallery({ selectedId, selectedIds, lang = 'vi', onSelect }: VibeGalleryProps) {
  return (
    <View style={styles.grid}>
      {VIBES.map(vibe => {
        const selected = selectedIds ? selectedIds.includes(vibe.id) : selectedId === vibe.id;
        const description = lang === 'en' ? vibe.descriptionEn : vibe.description;
        return (
          <TouchableOpacity
            key={vibe.id}
            activeOpacity={0.88}
            onPress={() => onSelect(vibe.id)}
            style={styles.cell}
          >
            <LinearGradient
              colors={[...vibe.grad]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.card, selected && styles.cardOn]}
            >
              <View style={styles.top}>
                <View style={styles.emojiWrap}>
                  <Text style={styles.emoji}>{vibe.emoji}</Text>
                </View>
                {selected ? <Text style={[styles.check, { color: vibe.color }]}>✓</Text> : null}
              </View>
              <Text style={[styles.name, { color: vibe.color }]} numberOfLines={1}>{vibe.name}</Text>
              <Text style={styles.desc} numberOfLines={2}>{description}</Text>
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: 18,
  },
  cell: {
    width: '50%',
    padding: 5,
  },
  card: {
    minHeight: 112,
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    ...Shadows.soft,
  },
  cardOn: {
    borderColor: Colors.primary,
    borderWidth: 2,
    ...Shadows.glow,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  emojiWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 18,
  },
  check: {
    fontSize: 14,
    fontWeight: '900',
  },
  name: {
    fontSize: 14,
    fontWeight: '900',
  },
  desc: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: Colors.textMid,
  },
});
