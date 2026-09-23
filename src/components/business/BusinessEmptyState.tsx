import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Shadows } from '../../constants/colors';

export default function BusinessEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={32} color={Colors.primary} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.desc}>{description}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} style={styles.btn} activeOpacity={0.88}>
          <LinearGradient colors={Gradients.primary} style={styles.btnGrad}>
            <Text style={styles.btnText}>{actionLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEEAF5',
    ...Shadows.soft,
  },
  title: { fontSize: 15, fontWeight: '900', color: Colors.textDark, marginTop: 12 },
  desc: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  btn: { marginTop: 16, borderRadius: 14, overflow: 'hidden', alignSelf: 'stretch' },
  btnGrad: { paddingVertical: 12, alignItems: 'center' },
  btnText: { color: Colors.white, fontWeight: '800' },
});
