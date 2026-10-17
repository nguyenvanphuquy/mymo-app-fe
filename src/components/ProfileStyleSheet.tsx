import React, { useEffect, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../constants/colors';
import { useI18n } from '../i18n';
import { PROFILE_FRAMES, PROFILE_THEMES, PROFILE_TITLES } from '../constants/profileStyle';
import {
  getVisitedPlaces,
  setFavoritePlaces,
  setProfileStyle,
  type FavoritePlace,
} from '../services/userApi';

interface ProfileStyleSheetProps {
  visible: boolean;
  avatarFrame: string | null;
  profileTheme: string | null;
  profileTitle: string | null;
  favoritePlaces: FavoritePlace[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ProfileStyleSheet({
  visible, avatarFrame, profileTheme, profileTitle, favoritePlaces, onClose, onSaved,
}: ProfileStyleSheetProps) {
  const { t } = useI18n();
  const [frame, setFrame] = useState<string | null>(avatarFrame);
  const [theme, setTheme] = useState<string | null>(profileTheme);
  const [title, setTitle] = useState<string | null>(profileTitle);
  const [picked, setPicked] = useState<string[]>(favoritePlaces.map(place => place.placeId));
  const [visited, setVisited] = useState<FavoritePlace[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setFrame(avatarFrame);
    setTheme(profileTheme);
    setTitle(profileTitle);
    setPicked(favoritePlaces.map(place => place.placeId));
    setLoadingPlaces(true);
    getVisitedPlaces()
      .then(setVisited)
      .catch(() => setVisited([]))
      .finally(() => setLoadingPlaces(false));
  }, [visible, avatarFrame, profileTheme, profileTitle, favoritePlaces]);

  const togglePlace = (placeId: string) => {
    setPicked(current => {
      if (current.includes(placeId)) return current.filter(id => id !== placeId);
      if (current.length >= 6) {
        Toast.show({ type: 'info', text1: t('style.favoritesLimit') });
        return current;
      }
      return [...current, placeId];
    });
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await setProfileStyle({ avatarFrame: frame, profileTheme: theme, profileTitle: title });
      await setFavoritePlaces(picked);
      Toast.show({ type: 'success', text1: t('style.saved') });
      onSaved();
      onClose();
    } catch (error) {
      Toast.show({ type: 'error', text1: error instanceof Error ? error.message : t('style.saveFailed') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{t('style.title')}</Text>
              <Text style={styles.note}>{t('style.badgeNote')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.close}>
              <Ionicons name="close" size={18} color={Colors.textDark} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            <Text style={styles.section}>{t('style.frame')}</Text>
            <View style={styles.row}>
              {PROFILE_FRAMES.map(item => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setFrame(frame === item.id ? null : item.id)}
                  style={[styles.swatch, { borderColor: item.color }, frame === item.id && styles.swatchOn]}
                />
              ))}
            </View>

            <Text style={styles.section}>{t('style.theme')}</Text>
            <View style={styles.row}>
              {PROFILE_THEMES.map(item => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setTheme(theme === item.id ? null : item.id)}
                  style={[styles.themeChip, { backgroundColor: item.background }, theme === item.id && styles.swatchOn]}
                >
                  <Text style={styles.chipText}>{t(`style.theme.${item.id}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.section}>{t('style.titles')}</Text>
            <View style={styles.row}>
              {PROFILE_TITLES.map(item => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setTitle(title === item ? null : item)}
                  style={[styles.themeChip, title === item && styles.titleOn]}
                >
                  <Text style={[styles.chipText, title === item && styles.titleOnText]}>{t(`style.title.${item}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.section}>{t('style.favorites')}</Text>
            <Text style={styles.note}>{t('style.favoritesHint')}</Text>
            {loadingPlaces ? <ActivityIndicator color={Colors.primary} style={styles.loader} /> : null}
            {!loadingPlaces && visited.length === 0 ? (
              <Text style={styles.note}>{t('style.favoritesEmpty')}</Text>
            ) : null}
            {visited.map(place => {
              const on = picked.includes(place.placeId);
              return (
                <TouchableOpacity key={place.placeId} onPress={() => togglePlace(place.placeId)} style={styles.place}>
                  <Ionicons name={on ? 'heart' : 'heart-outline'} size={16} color={Colors.primary} />
                  <Text style={styles.placeName}>{place.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity onPress={save} style={styles.save} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('common.save')}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(79,40,82,0.28)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textDark,
  },
  note: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textMuted,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8F4FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingBottom: 12,
  },
  section: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 4,
    backgroundColor: '#fff',
  },
  swatchOn: {
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  themeChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8F4FB',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
  },
  titleOn: {
    backgroundColor: '#F8E9FF',
    borderColor: '#F3D7F6',
  },
  titleOnText: {
    color: Colors.primary,
  },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  placeName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  loader: {
    marginVertical: 12,
  },
  save: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 14,
  },
  saveText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});
