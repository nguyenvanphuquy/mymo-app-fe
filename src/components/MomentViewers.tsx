import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Image,
  ScrollView, ActivityIndicator, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useI18n } from '../i18n';
import { avatarUri } from '../constants/defaultAvatar';
import { getStoryViewers, type StoryViewers } from '../services/postApi';
import { openUserProfile } from '../utils/openUserProfile';

interface MomentViewersProps {
  postId: string;
  variant?: 'dark' | 'light';
  onOpenChange?: (open: boolean) => void;
}

function formatViewedAt(value: string, lang: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  });
}

export default function MomentViewers({ postId, variant = 'dark', onOpenChange }: MomentViewersProps) {
  const { t, lang } = useI18n();
  const [info, setInfo] = useState<StoryViewers | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setInfo(await getStoryViewers(postId));
    } catch {
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setSheet = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
    if (next) void load();
  };

  const count = info?.viewerCount ?? 0;
  const label = t('story.viewersCount').replace('{count}', String(count));
  const dark = variant === 'dark';

  return (
    <>
      <TouchableOpacity
        onPress={() => setSheet(true)}
        style={[styles.trigger, dark ? styles.triggerDark : styles.triggerLight]}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator size="small" color={dark ? '#FFF' : Colors.primary} />
        ) : (
          <Ionicons name="eye-outline" size={16} color={dark ? '#FFF' : Colors.primary} />
        )}
        <Text style={[styles.triggerText, !dark && styles.triggerTextLight]} numberOfLines={1}>
          {label}
        </Text>
        {!info?.unlocked && count > 0 ? (
          <Ionicons name="lock-closed" size={12} color={dark ? '#FDE68A' : Colors.primary} />
        ) : (
          <Ionicons name="chevron-up" size={14} color={dark ? 'rgba(255,255,255,0.8)' : Colors.primary} />
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSheet(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.title}>{t('story.viewersTitle')}</Text>
            <Text style={styles.countLine}>{label}</Text>

            {loading ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} /> : null}

            {!loading && info && !info.unlocked ? (
              <View style={styles.lockBox}>
                <Ionicons name="lock-closed" size={22} color={Colors.primary} />
                <Text style={styles.lockText}>{t('story.viewersLocked')}</Text>
              </View>
            ) : null}

            {!loading && info?.unlocked && info.viewers.length === 0 ? (
              <Text style={styles.empty}>{t('story.viewersEmpty')}</Text>
            ) : null}

            {!loading && info?.unlocked && info.viewers.length > 0 ? (
              <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 12 }}>
                {info.viewers.map(viewer => (
                  <TouchableOpacity
                    key={viewer.userId}
                    style={styles.row}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSheet(false);
                      openUserProfile({
                        userId: viewer.userId,
                        displayName: viewer.displayName,
                        avatarUrl: viewer.avatarUrl,
                      });
                    }}
                  >
                    <Image source={{ uri: avatarUri(viewer.avatarUrl) }} style={styles.avatar} />
                    <View style={styles.rowText}>
                      <Text style={styles.name} numberOfLines={1}>{viewer.displayName}</Text>
                      <Text style={styles.time}>{formatViewedAt(viewer.viewedAt, lang)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 8,
  },
  triggerDark: {
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  triggerLight: {
    backgroundColor: Colors.primaryTint,
    marginTop: 10,
  },
  triggerText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  triggerTextLight: {
    color: Colors.primary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '70%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
  },
  countLine: {
    marginTop: 4,
    marginBottom: 12,
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  lockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primaryTint,
    borderRadius: 16,
    padding: 14,
  },
  lockText: {
    flex: 1,
    color: Colors.textDark,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  empty: {
    color: '#6B7280',
    fontSize: 13,
    paddingVertical: 12,
  },
  list: {
    maxHeight: 360,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryTint,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
  },
  time: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
});
