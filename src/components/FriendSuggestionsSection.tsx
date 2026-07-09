import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import type { FriendSummary } from '../services/friendsApi';

interface FriendSuggestionsSectionProps {
  suggestions: FriendSummary[];
  onAdd: (user: FriendSummary) => void;
}

export default function FriendSuggestionsSection({ suggestions, onAdd }: FriendSuggestionsSectionProps) {
  const { t } = useI18n();

  if (suggestions.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Ionicons name="sparkles-outline" size={16} color={Colors.primary} />
        <Text style={styles.title}>{t('friends.suggestions')}</Text>
      </View>

      {suggestions.slice(0, 5).map(user => (
        <View key={user.userId} style={styles.card}>
          <View style={styles.userRow}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={18} color={Colors.primary} />
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.name}>{user.displayName}</Text>
              <Text style={styles.sub}>
                {user.mutualFriendsCount
                  ? `${user.mutualFriendsCount} ${t('friends.mutualFriends')}`
                  : t('friends.suggestionHint')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => onAdd(user)}
              activeOpacity={0.85}
              style={styles.addBtn}
            >
              <LinearGradient colors={Gradients.primary as any} style={styles.addGrad}>
                <Ionicons name="person-add" size={14} color={Colors.white} />
              </LinearGradient>
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
  addBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  addGrad: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
