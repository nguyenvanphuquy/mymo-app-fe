import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import type { SentFriendRequest } from '../services/friendsApi';

interface SentRequestsSectionProps {
  requests: SentFriendRequest[];
  onCancel: (request: SentFriendRequest) => void;
}

export default function SentRequestsSection({ requests, onCancel }: SentRequestsSectionProps) {
  const { t } = useI18n();

  if (requests.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Ionicons name="paper-plane-outline" size={16} color={Colors.primary} />
        <Text style={styles.title}>{t('friends.sentRequests')}</Text>
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
              <Text style={styles.sub}>{t('friends.pendingSent')}</Text>
            </View>
            <TouchableOpacity
              onPress={() => onCancel(request)}
              style={styles.cancelBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>{t('friends.cancelRequest')}</Text>
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
    gap: 8,
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
    backgroundColor: '#94A3B8',
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
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0EDF8',
    ...Shadows.soft,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryTint,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textDark,
  },
  sub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F8F6FF',
    borderWidth: 1,
    borderColor: '#EBE8FF',
  },
  cancelText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
  },
});
