import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import type { PendingFriendRequest } from '../services/friendsApi';

interface FriendRequestsSectionProps {
  requests: PendingFriendRequest[];
  onAccept: (request: PendingFriendRequest) => void;
  onReject: (request: PendingFriendRequest) => void;
  compact?: boolean;
}

export default function FriendRequestsSection({
  requests,
  onAccept,
  onReject,
  compact = false,
}: FriendRequestsSectionProps) {
  const { t } = useI18n();

  if (requests.length === 0) return null;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.titleRow}>
        <Ionicons name="person-add-outline" size={16} color={Colors.primary} />
        <Text style={styles.title}>{t('friends.requests')}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{requests.length}</Text>
        </View>
      </View>

      {requests.map(request => (
        <View key={request.userId} style={styles.card}>
          <View style={styles.userRow}>
            {request.avatarUrl ? (
              <Image source={{ uri: request.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={18} color={Colors.primary} />
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.name}>{request.displayName}</Text>
              <Text style={styles.sub}>{t('notif.text.request')}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => onAccept(request)}
              activeOpacity={0.85}
              style={styles.acceptBtn}
            >
              <LinearGradient colors={Gradients.primary as any} style={styles.acceptGrad}>
                <Text style={styles.acceptText}>{t('common.accept')}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onReject(request)}
              activeOpacity={0.85}
              style={styles.rejectBtn}
            >
              <Text style={styles.rejectText}>{t('common.reject')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  wrapCompact: {
    paddingHorizontal: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
    flex: 1,
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0EDF8',
    ...Shadows.soft,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryTint,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
  },
  sub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  acceptGrad: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  acceptText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 12,
  },
  rejectBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F8F6FF',
    borderWidth: 1,
    borderColor: '#EBE8FF',
  },
  rejectText: {
    color: Colors.textMuted,
    fontWeight: '800',
    fontSize: 12,
  },
});
