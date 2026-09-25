import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import { chatWithMymy, type MymyTurn } from '../services/mymyApi';

type ChatTurn = MymyTurn & { id: string; error?: boolean };

interface Props {
  visible: boolean;
  onClose: () => void;
}

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function MymyChat({ visible, onClose }: Props) {
  const { t } = useI18n();
  const greeting = t('bot.greeting');
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatTurn>>(null);
  const sendingRef = useRef(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>(() => [
    { id: 'greeting', role: 'model', text: greeting },
  ]);

  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === 'greeting' && prev[0].text !== greeting) {
        return [{ id: 'greeting', role: 'model', text: greeting }];
      }
      return prev;
    });
  }, [greeting]);

  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(timer);
  }, [messages, sending, visible]);

  if (!visible) return null;

  const started = messages.some(m => m.role === 'user');

  const send = async (raw?: string) => {
    const value = (raw ?? text).trim();
    if (!value || sendingRef.current) return;
    sendingRef.current = true;

    const history: MymyTurn[] = messages
      .filter(m => m.id !== 'greeting' && !m.error)
      .map(m => ({ role: m.role, text: m.text }));

    setMessages(prev => [...prev, { id: nextId(), role: 'user', text: value }]);
    setText('');
    setSending(true);
    try {
      const reply = await chatWithMymy(value, history);
      setMessages(prev => [...prev, { id: nextId(), role: 'model', text: reply }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('bot.failed');
      setMessages(prev => [...prev, { id: nextId(), role: 'model', text: message, error: true }]);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
      >
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.header}>
            <Image source={require('../../assets/mymo-bot.png')} style={styles.avatar} />
            <View style={styles.headerText}>
              <Text style={styles.name}>{t('bot.name')}</Text>
              <Text style={styles.subtitle}>{t('bot.subtitle')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <Ionicons name="close" size={20} color={Colors.textMid} />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={listRef}
            style={styles.list}
            data={messages}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messages}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const mine = item.role === 'user';
              return (
                <View style={[styles.row, mine ? styles.rowMine : styles.rowBot]}>
                  {!mine && (
                    <Image source={require('../../assets/mymo-bot.png')} style={styles.miniAvatar} />
                  )}
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleBot, item.error && styles.bubbleError]}>
                    <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.text}</Text>
                  </View>
                </View>
              );
            }}
            ListFooterComponent={sending ? (
              <View style={[styles.row, styles.rowBot]}>
                <Image source={require('../../assets/mymo-bot.png')} style={styles.miniAvatar} />
                <View style={[styles.bubble, styles.bubbleBot, styles.thinking]}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.thinkingText}>{t('bot.thinking')}</Text>
                </View>
              </View>
            ) : null}
          />

          {!started && (
            <View style={styles.suggestions}>
              {[t('bot.suggestApp'), t('bot.suggestPlace')].map(label => (
                <TouchableOpacity
                  key={label}
                  style={styles.chip}
                  onPress={() => send(label)}
                  disabled={sending}
                >
                  <Text style={styles.chipText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('bot.placeholder')}
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
              multiline
              maxLength={2000}
              onSubmitEditing={() => send()}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnOff]}
              onPress={() => send()}
              disabled={!text.trim() || sending}
            >
              <Ionicons name="send" size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 90,
    elevation: 30,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(42, 23, 88, 0.28)',
  },
  sheetWrap: {
    maxHeight: '82%',
  },
  sheet: {
    height: 560,
    maxHeight: '100%',
    backgroundColor: '#FBF8FF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 14,
    paddingHorizontal: 14,
    ...Shadows.soft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
  },
  headerText: {
    flex: 1,
    marginLeft: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textDark,
  },
  subtitle: {
    marginTop: 1,
    fontSize: 12,
    color: Colors.textMuted,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  list: {
    flex: 1,
  },
  messages: {
    paddingVertical: 8,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowBot: {
    justifyContent: 'flex-start',
  },
  miniAvatar: {
    width: 28,
    height: 28,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bubbleMine: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 6,
  },
  bubbleBot: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleError: {
    borderColor: '#F3C6D4',
    backgroundColor: '#FFF6F8',
  },
  bubbleText: {
    fontSize: 14.5,
    lineHeight: 20,
    color: Colors.textDark,
  },
  bubbleTextMine: {
    color: Colors.white,
  },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thinkingText: {
    color: Colors.textMid,
    fontSize: 13,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: Colors.white,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    color: Colors.primaryDark,
    fontSize: 12.5,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderRadius: 22,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 15,
    color: Colors.textDark,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: {
    opacity: 0.45,
  },
});
