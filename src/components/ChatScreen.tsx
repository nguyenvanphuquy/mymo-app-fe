import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, Image, ActivityIndicator,
  Modal, Pressable, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { DeviceEventEmitter } from 'react-native';
import { Colors, Gradients, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import SparkleField from './SparkleField';
import Toast from 'react-native-toast-message';
import {
  getMessages,
  sendMessage,
  markConversationRead,
  MessageType,
  type ChatMessage,
} from '../services/chatApi';
import {
  joinConversation,
  leaveConversation,
  onReceiveMessage,
  onUserTyping,
  onUserStopTyping,
} from '../services/chatHub';
import { uploadMedia } from '../services/mediaApi';
import { buildImageFormData, guessImageMeta } from '../utils/imageFormData';
import { getStoredAuthSession } from '../services/authApi';

export interface ChatScreenProps {
  conversationId: string;
  title: string;
  avatarUrl?: string | null;
  sharePostId?: string;
  sharePlaceId?: string;
  onClose: () => void;
}

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop';

export default function ChatScreen({
  conversationId,
  title,
  avatarUrl,
  sharePostId,
  sharePlaceId,
  onClose,
}: ChatScreenProps) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [typingName, setTypingName] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const flatRef = useRef<FlatList>(null);
  const sharedOnce = useRef(false);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => {
      if (prev.some(m => m.messageId === msg.messageId)) return prev;
      return [...prev, msg];
    });
    scrollToEnd();
  }, [scrollToEnd]);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const page = await getMessages(conversationId, 1, 100);
      setMessages(page.items);
      await markConversationRead(conversationId);
      DeviceEventEmitter.emit('chat:refresh');
      scrollToEnd();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: String(err instanceof Error ? err.message : t('chat.loadError')),
      });
    } finally {
      setLoading(false);
    }
  }, [conversationId, scrollToEnd, t]);

  useEffect(() => {
    getStoredAuthSession().then(session => {
      if (session?.userId) setMyUserId(session.userId);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        await joinConversation(conversationId);
      } catch {
        // REST fallback still works
      }
    })();

    const unsubMsg = onReceiveMessage(msg => {
      if (!active || msg.conversationId !== conversationId) return;
      appendMessage(msg);
      if (msg.sender.userId !== myUserId) {
        markConversationRead(conversationId).catch(() => {});
        DeviceEventEmitter.emit('chat:refresh');
      }
    });

    const unsubTyping = onUserTyping(({ userId, displayName }) => {
      if (userId !== myUserId) setTypingName(displayName);
    });

    const unsubStop = onUserStopTyping(({ userId }) => {
      if (userId !== myUserId) setTypingName(null);
    });

    return () => {
      active = false;
      unsubMsg();
      unsubTyping();
      unsubStop();
      leaveConversation(conversationId).catch(() => {});
    };
  }, [conversationId, myUserId, appendMessage]);

  useEffect(() => {
    if (sharedOnce.current || loading) return;
    if (!sharePostId && !sharePlaceId) return;

    sharedOnce.current = true;
    (async () => {
      try {
        if (sharePostId) {
          await sendMessage(conversationId, {
            messageType: MessageType.Post,
            referenceId: sharePostId,
          });
        } else if (sharePlaceId) {
          await sendMessage(conversationId, {
            messageType: MessageType.Place,
            referenceId: sharePlaceId,
          });
        }
        await loadMessages();
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: String(err instanceof Error ? err.message : t('chat.sendError')),
        });
      }
    })();
  }, [sharePostId, sharePlaceId, loading, conversationId, loadMessages, t]);

  const handleSendText = async () => {
    const v = text.trim();
    if (!v || sending) return;

    setSending(true);
    setText('');
    try {
      const msg = await sendMessage(conversationId, {
        messageType: MessageType.Text,
        content: v,
      });
      appendMessage(msg);
      DeviceEventEmitter.emit('chat:refresh');
    } catch (err) {
      setText(v);
      Toast.show({
        type: 'error',
        text1: String(err instanceof Error ? err.message : t('chat.sendError')),
      });
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    setAttachOpen(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'info', text1: t('chat.photoDenied') });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    setSending(true);
    try {
      const asset = result.assets[0];
      const { fileName, fileType } = guessImageMeta(asset.uri, 'chat.jpg');
      const formData = await buildImageFormData(asset.uri, fileName, fileType);
      const uploaded = await uploadMedia(formData);
      const msg = await sendMessage(conversationId, {
        messageType: MessageType.Image,
        mediaId: uploaded.id,
      });
      appendMessage(msg);
      DeviceEventEmitter.emit('chat:refresh');
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: String(err instanceof Error ? err.message : t('chat.sendError')),
      });
    } finally {
      setSending(false);
    }
  };

  const handleShareLocation = async () => {
    setAttachOpen(false);
    setSending(true);
    try {
      let latitude: number;
      let longitude: number;

      if (Platform.OS === 'web') {
        const coords = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
        });
        latitude = coords.coords.latitude;
        longitude = coords.coords.longitude;
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Toast.show({ type: 'info', text1: t('chat.locationDenied') });
          return;
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      }

      const msg = await sendMessage(conversationId, {
        messageType: MessageType.Location,
        latitude,
        longitude,
      });
      appendMessage(msg);
      DeviceEventEmitter.emit('chat:refresh');
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: String(err instanceof Error ? err.message : t('chat.locationError')),
      });
    } finally {
      setSending(false);
    }
  };

  const renderMessageBody = (item: ChatMessage, isMe: boolean) => {
    switch (item.messageType) {
      case MessageType.Image:
        return (
          <Image
            source={{ uri: item.mediaUrl || item.content }}
            style={styles.imageBubble}
            resizeMode="cover"
          />
        );

      case MessageType.Location:
        return (
          <TouchableOpacity
            onPress={() => {
              if (item.latitude != null && item.longitude != null) {
                const url = Platform.select({
                  ios: `maps:0,0?q=${item.latitude},${item.longitude}`,
                  android: `geo:${item.latitude},${item.longitude}`,
                  default: `https://www.google.com/maps?q=${item.latitude},${item.longitude}`,
                });
                if (url) Linking.openURL(url).catch(() => {});
              }
            }}
            style={styles.locationBubble}
          >
            <Ionicons name="location" size={18} color={isMe ? Colors.white : Colors.primary} />
            <Text style={[styles.locationText, isMe && styles.locationTextMe]}>
              {t('chat.sharedLocation')}
            </Text>
          </TouchableOpacity>
        );

      case MessageType.Post:
        return (
          <View style={styles.shareBubble}>
            <Ionicons name="images-outline" size={16} color={isMe ? Colors.white : Colors.primary} />
            <Text style={[styles.shareText, isMe && styles.shareTextMe]}>{t('chat.sharedPost')}</Text>
            {item.content ? (
              <Text style={[styles.shareSub, isMe && styles.shareSubMe]} numberOfLines={2}>{item.content}</Text>
            ) : null}
          </View>
        );

      case MessageType.Place:
        return (
          <View style={styles.shareBubble}>
            <Ionicons name="map-outline" size={16} color={isMe ? Colors.white : Colors.primary} />
            <Text style={[styles.shareText, isMe && styles.shareTextMe]}>{t('chat.sharedPlace')}</Text>
            {item.content ? (
              <Text style={[styles.shareSub, isMe && styles.shareSubMe]} numberOfLines={2}>{item.content}</Text>
            ) : null}
          </View>
        );

      default:
        return (
          <Text style={isMe ? styles.bubbleMeText : styles.bubbleThemText}>{item.content}</Text>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <Image source={{ uri: avatarUrl || FALLBACK_AVATAR }} style={styles.headerAvatar} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{title}</Text>
          <Text style={styles.statusText}>
            {typingName ? `${typingName} ${t('chat.typing')}` : t('chat.online')}
          </Text>
        </View>
        <Ionicons name="sparkles" size={18} color={Colors.primaryLight} />
      </View>

      <View style={styles.msgWrap}>
        <SparkleField count={8} />
        {loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={m => m.messageId}
            contentContainerStyle={styles.msgList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToEnd}
            ListEmptyComponent={
              <Text style={styles.emptyText}>{t('chat.empty')}</Text>
            }
            renderItem={({ item }) => {
              const isMe = item.sender.userId === myUserId;
              return (
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                  {isMe ? (
                    <LinearGradient
                      colors={Gradients.primary}
                      style={styles.bubbleMeGrad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {renderMessageBody(item, true)}
                    </LinearGradient>
                  ) : (
                    <View style={styles.bubbleThemView}>
                      {renderMessageBody(item, false)}
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputBar}>
          <TouchableOpacity
            onPress={() => setAttachOpen(true)}
            style={styles.attachBtn}
            disabled={sending}
          >
            <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
            returnKeyType="send"
            onSubmitEditing={handleSendText}
            editable={!sending}
          />
          <TouchableOpacity
            onPress={handleSendText}
            activeOpacity={0.85}
            style={styles.sendBtn}
            disabled={sending || !text.trim()}
          >
            <LinearGradient
              colors={Gradients.primary}
              style={styles.sendGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {sending ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="send" size={16} color={Colors.white} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={attachOpen} transparent animationType="fade" onRequestClose={() => setAttachOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAttachOpen(false)}>
          <View style={styles.attachSheet}>
            <Text style={styles.attachTitle}>{t('chat.attach')}</Text>
            <TouchableOpacity style={styles.attachItem} onPress={handlePickImage}>
              <Ionicons name="image-outline" size={20} color={Colors.primary} />
              <Text style={styles.attachLabel}>{t('chat.attachPhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachItem} onPress={handleShareLocation}>
              <Ionicons name="location-outline" size={20} color={Colors.primary} />
              <Text style={styles.attachLabel}>{t('chat.attachLocation')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryTint,
    ...Platform.select({
      web: {
        maxWidth: 500,
        width: '100%',
        marginHorizontal: 'auto',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#EBE8F5',
      },
      default: {},
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    ...Shadows.soft,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: Colors.white,
    backgroundColor: Colors.primaryTint,
    ...Shadows.glow,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
  },
  statusText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 2,
  },
  msgWrap: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textMuted,
    marginTop: 40,
    fontSize: 13,
  },
  msgList: {
    padding: 16,
    gap: 10,
    paddingBottom: 20,
    flexGrow: 1,
  },
  bubble: {
    maxWidth: '78%',
  },
  bubbleMe: {
    alignSelf: 'flex-end',
  },
  bubbleThem: {
    alignSelf: 'flex-start',
  },
  bubbleMeGrad: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderBottomRightRadius: 6,
    ...Shadows.glow,
  },
  bubbleMeText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  bubbleThemView: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderBottomLeftRadius: 6,
    ...Shadows.soft,
  },
  bubbleThemText: {
    color: Colors.textDark,
    fontSize: 14,
  },
  imageBubble: {
    width: 180,
    height: 180,
    borderRadius: 14,
  },
  locationBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  locationTextMe: {
    color: Colors.white,
  },
  shareBubble: {
    gap: 4,
  },
  shareText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  shareTextMe: {
    color: Colors.white,
  },
  shareSub: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  shareSubMe: {
    color: 'rgba(255,255,255,0.85)',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
    ...Shadows.float,
  },
  attachBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.primaryTint,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textDark,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  sendGrad: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  attachSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    gap: 8,
  },
  attachTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 8,
  },
  attachItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EEF8',
  },
  attachLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
});
