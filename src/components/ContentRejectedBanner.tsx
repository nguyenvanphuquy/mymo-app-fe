import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ContentRejectedBannerProps = {
  message: string;
  onDark?: boolean;
};

export default function ContentRejectedBanner({ message, onDark }: ContentRejectedBannerProps) {
  return (
    <View style={[styles.box, onDark ? styles.dark : styles.light]}>
      <Ionicons name="alert-circle" size={18} color={onDark ? '#FFE8A3' : '#9A5B00'} />
      <Text style={[styles.text, onDark ? styles.textDark : styles.textLight]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  dark: {
    backgroundColor: 'rgba(255, 214, 120, 0.16)',
    borderColor: 'rgba(255, 214, 120, 0.5)',
  },
  light: {
    backgroundColor: '#FFF6E8',
    borderColor: '#F0D7A2',
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  textDark: {
    color: '#FFF4D2',
  },
  textLight: {
    color: '#6B4A12',
  },
});
