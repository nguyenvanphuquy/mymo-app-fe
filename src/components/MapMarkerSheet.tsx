import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Image, ActivityIndicator, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors, Gradients } from '../constants/colors';
import { useI18n } from '../i18n';
import { MAP_CHARACTERS, isMapImage, mapCharacterEmoji } from '../constants/mapCharacters';
import { setMapMarker, uploadMapMarkerImage } from '../services/userApi';
import { buildImageFormData, guessImageMeta } from '../utils/imageFormData';
import { LinearGradient } from 'expo-linear-gradient';

interface MapMarkerSheetProps {
  visible: boolean;
  current: string | null;
  onClose: () => void;
  onSaved: (marker: string | null) => void;
}

export default function MapMarkerSheet({ visible, current, onClose, onSaved }: MapMarkerSheetProps) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  const saveCharacter = async (marker: string | null) => {
    if (busy) return;
    setBusy(true);
    try {
      const saved = await setMapMarker(marker);
      onSaved(saved);
      Toast.show({ type: 'success', text1: t('mapMarker.saved') });
      onClose();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: error instanceof Error ? error.message : t('mapMarker.saveFailed'),
      });
    } finally {
      setBusy(false);
    }
  };

  const pickImage = async () => {
    if (busy) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted' && perm.status !== 'undetermined') {
      Toast.show({ type: 'error', text1: t('cam.libraryDenied') });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const asset = result.assets[0];
    setBusy(true);
    try {
      const meta = guessImageMeta(asset.uri, 'map-avatar.jpg');
      const form = await buildImageFormData(
        asset.uri,
        asset.fileName || meta.fileName,
        asset.mimeType || meta.fileType,
      );
      const url = await uploadMapMarkerImage(form);
      onSaved(url);
      Toast.show({ type: 'success', text1: t('mapMarker.saved') });
      onClose();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: error instanceof Error ? error.message : t('mapMarker.saveFailed'),
      });
    } finally {
      setBusy(false);
    }
  };

  const previewEmoji = mapCharacterEmoji(current);
  const previewImage = isMapImage(current);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('mapMarker.title')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.close}>
              <Ionicons name="close" size={20} color={Colors.textDark} />
            </TouchableOpacity>
          </View>
          <Text style={styles.sub}>{t('mapMarker.sub')}</Text>

          <View style={styles.preview}>
            {previewImage ? (
              <Image source={{ uri: current! }} style={styles.previewImage} />
            ) : (
              <Text style={styles.previewEmoji}>{previewEmoji || '🙂'}</Text>
            )}
          </View>

          <ScrollView contentContainerStyle={styles.grid}>
            {MAP_CHARACTERS.map(item => {
              const active = current === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.cell, active && styles.cellActive]}
                  onPress={() => { void saveCharacter(item.id); }}
                  disabled={busy}
                >
                  <Text style={styles.emoji}>{item.emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity onPress={() => { void pickImage(); }} disabled={busy} activeOpacity={0.88}>
            <LinearGradient colors={Gradients.primary} style={styles.upload}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="image-outline" size={16} color="#fff" />
                  <Text style={styles.uploadText}>{t('mapMarker.upload')}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { void saveCharacter(null); }} disabled={busy} style={styles.reset}>
            <Text style={styles.resetText}>{t('mapMarker.usePhoto')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
  },
  close: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sub: {
    marginTop: 4,
    marginBottom: 12,
    color: '#6B7280',
    fontSize: 13,
  },
  preview: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  previewImage: {
    width: 72,
    height: 72,
  },
  previewEmoji: {
    fontSize: 36,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 16,
  },
  cell: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#F8F5FC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cellActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryTint,
  },
  emoji: {
    fontSize: 30,
  },
  upload: {
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  uploadText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  reset: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 8,
  },
  resetText: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
