import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Platform, StatusBar, DeviceEventEmitter,
} from 'react-native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { I18nProvider, useI18n } from './src/i18n';
import { Colors, Gradients, Shadows } from './src/constants/colors';
import type { Friend } from './src/constants/data';

import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import FriendProfileScreen, { type FriendProfileParams } from './src/screens/FriendProfileScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CameraSheet from './src/components/CameraSheet';
import ChatScreen from './src/components/ChatScreen';
import type { OpenChatParams } from './src/components/ConversationsSection';
import AddFriendSheet from './src/components/AddFriendSheet';
import PostSheet from './src/components/PostSheet';
import MymoBot from './src/components/MymoBot';
import { LocationPermSheet, EnableLocationModal } from './src/components/LocationPermSheet';
import type { PostView } from './src/services/postApi';
import { hideUserLocation, updateUserSettings } from './src/services/userApi';
import {
  clearLocationPrivacyPrefs,
  getLocationPrivacyPrefs,
  saveLocationPrivacyPrefs,
} from './src/utils/locationPrivacyStorage';
import { syncCurrentLocationToServer } from './src/utils/syncUserLocation';

type Screen = 'auth' | 'app';
type Tab = 'home' | 'map' | 'friends' | 'profile';

type ChatSession = {
  conversationId: string;
  title: string;
  avatarUrl?: string | null;
  sharePostId?: string;
  sharePlaceId?: string;
} | null;

type FriendProfileSession = FriendProfileParams | null;

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        body {
          background-color: #F3F1F8 !important;
          margin: 0;
          padding: 0;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <AppInner />
        <Toast />
      </I18nProvider>
    </SafeAreaProvider>
  );
}

function AppInner() {
  const { t } = useI18n();
  const [checkingSession, setCheckingSession] = useState(true);
  useEffect(() => {
    (async () => {
      const { getStoredAuthSession } = await import('./src/services/authApi');
      try {
        const session = await getStoredAuthSession();
        const prefs = await getLocationPrivacyPrefs();
        const { status } = await Location.getForegroundPermissionsAsync();
        const osGranted = status === 'granted';

        if (session) {
          setScreen('app');
          setLocationGranted(osGranted);
          if (prefs) {
            setShareLocationOnMap(prefs.locationSharing);
            setIncognito(prefs.incognito);
            setPermissionAsked(true);
          } else if (osGranted) {
            setPermissionAsked(true);
          }
        }
      } catch {
        // ignore
      } finally {
        setCheckingSession(false);
      }
    })();
  }, []);
  const [screen, setScreen] = useState<Screen>('auth');
  const [tab, setTab] = useState<Tab>('home');
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [shareLocationOnMap, setShareLocationOnMap] = useState(true);
  const [incognito, setIncognito] = useState(false);
  const [permissionAsked, setPermissionAsked] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [locationPromptOpen, setLocationPromptOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [chatSession, setChatSession] = useState<ChatSession>(null);
  const [friendProfile, setFriendProfile] = useState<FriendProfileSession>(null);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifPost, setNotifPost] = useState<PostView | null>(null);

  useEffect(() => {
    if (screen !== 'app') return;

    const loadUnread = async () => {
      try {
        const { getUnreadCount } = await import('./src/services/notificationsApi');
        const count = await getUnreadCount();
        setUnreadNotifCount(count);
      } catch {
        setUnreadNotifCount(0);
      }
    };

    loadUnread();
    const timer = setInterval(loadUnread, 45000);
    const sub = DeviceEventEmitter.addListener('friend:requested', loadUnread);
    const sub2 = DeviceEventEmitter.addListener('friend:accepted', loadUnread);
    return () => {
      clearInterval(timer);
      sub.remove();
      sub2.remove();
    };
  }, [screen]);

  useEffect(() => {
    if (screen === 'app' && !permissionAsked) {
      const timer = setTimeout(() => setPermissionAsked(true), 700);
      return () => clearTimeout(timer);
    }
  }, [screen, permissionAsked]);

  /** Sync privacy flags; re-push GPS when sharing is turned back on. */
  const applyLocationPrivacy = (sharing: boolean, isAnonymous: boolean) => {
    void saveLocationPrivacyPrefs({ locationSharing: sharing, incognito: isAnonymous });
    void updateUserSettings({
      isLocationSharing: sharing,
      isAnonymous,
    }).catch(() => {
      Toast.show({ type: 'error', text1: t('loc.settingsError') || 'Không cập nhật được cài đặt vị trí' });
    });

    if (!sharing || isAnonymous) {
      void hideUserLocation().catch(() => {});
      return;
    }

    void syncCurrentLocationToServer().catch(() => {});
  };

  const handleEnableLocation = () => {
    setLocationGranted(true);
    setShareLocationOnMap(true);
    setIncognito(false);
    setPermissionAsked(true);
    setLocationPromptOpen(false);
    applyLocationPrivacy(true, false);
    Toast.show({ type: 'success', text1: t('loc.enabled'), text2: t('loc.enabledDesc') });
  };

  const handleDenyLocation = () => {
    setLocationGranted(false);
    setShareLocationOnMap(false);
    setIncognito(false);
    setPermissionAsked(true);
    setLocationPromptOpen(false);
    applyLocationPrivacy(false, false);
    Toast.show({ type: 'info', text1: t('loc.off'), text2: t('loc.offDesc') });
  };

  const visibleOnMap = !!locationGranted && shareLocationOnMap && !incognito;

  const handleOpenFriendProfile = (params: FriendProfileParams) => {
    setFriendProfile(params);
  };

  const handleOpenChat = async (params: OpenChatParams & { sharePostId?: string; sharePlaceId?: string }) => {
    try {
      const { createPrivateConversation } = await import('./src/services/chatApi');
      let conversationId = params.conversationId;
      if (!conversationId && params.userId) {
        const conv = await createPrivateConversation(params.userId);
        conversationId = conv.conversationId;
      }
      if (!conversationId) return;

      setChatSession({
        conversationId,
        title: params.title,
        avatarUrl: params.avatarUrl,
        sharePostId: params.sharePostId,
        sharePlaceId: params.sharePlaceId,
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: String(err instanceof Error ? err.message : t('chat.openError')),
      });
    }
  };

  if (screen === 'auth') {
    return <AuthScreen onContinue={() => setScreen('app')} />;
  }

  // Friend profile full screen
  if (friendProfile) {
    const profileParams = friendProfile;
    return (
      <FriendProfileScreen
        userId={profileParams.userId}
        displayName={profileParams.displayName}
        avatarUrl={profileParams.avatarUrl}
        onClose={() => setFriendProfile(null)}
        onMessage={() => {
          const { userId, displayName, avatarUrl } = profileParams;
          setFriendProfile(null);
          handleOpenChat({ userId, title: displayName || t('friends.someone'), avatarUrl });
        }}
      />
    );
  }

  // Chat screen takes full screen
  if (chatSession) {
    return (
      <ChatScreen
        conversationId={chatSession.conversationId}
        title={chatSession.title}
        avatarUrl={chatSession.avatarUrl}
        sharePostId={chatSession.sharePostId}
        sharePlaceId={chatSession.sharePlaceId}
        onClose={() => {
          setChatSession(null);
          DeviceEventEmitter.emit('chat:refresh');
        }}
      />
    );
  }

  return (
    <View style={styles.root}>
      {/* Main content */}
      <View style={styles.content}>
        {tab === 'home' && (
          <HomeScreen
            isActive={tab === 'home'}
            locationGranted={!!locationGranted}
            unreadNotifCount={unreadNotifCount}
            onGoMap={() => setTab('map')}
            onGoFriends={() => setTab('friends')}
            onGoProfile={() => setTab('profile')}
            onUnreadCountChange={setUnreadNotifCount}
            onOpenPost={(postId) => {
              setNotifPost({
                postId,
                displayName: '',
                caption: '',
                likeCount: 0,
                commentCount: 0,
              });
            }}
            onOpenChat={(conversationId, title, avatarUrl) => {
              handleOpenChat({ conversationId, title, avatarUrl });
            }}
          />
        )}
        {tab === 'map' && (
          <MapScreen
            locationGranted={!!locationGranted}
            visibleOnMap={visibleOnMap}
            incognito={incognito}
            isActive={tab === 'map' && !cameraOpen}
            onFriendTap={setSelectedFriend}
            selectedFriend={selectedFriend}
            onCloseSheet={() => setSelectedFriend(null)}
            onMessage={f => { setSelectedFriend(null); handleOpenChat({ userId: f.id, title: f.name, avatarUrl: f.avatarUrl }); }}
            onViewProfile={f => {
              setSelectedFriend(null);
              handleOpenFriendProfile({
                userId: f.id,
                displayName: f.name,
                avatarUrl: f.avatarUrl,
              });
            }}
            onDisableIncognito={() => {
              setIncognito(false);
              applyLocationPrivacy(shareLocationOnMap, false);
              Toast.show({ type: 'info', text1: t('loc.incognitoOff'), text2: t('loc.incognitoOffDesc') });
            }}
          />
        )}
        {tab === 'friends' && (
          <FriendsScreen
            onFriendTap={setSelectedFriend}
            onOpenChat={handleOpenChat}
            onViewProfile={handleOpenFriendProfile}
            onAdd={() => setAddFriendOpen(true)}
          />
        )}
        {tab === 'profile' && (
          <ProfileScreen
            locationGranted={!!locationGranted}
            shareLocationOnMap={shareLocationOnMap}
            incognito={incognito}
            isActive={tab === 'profile'}
            onToggleShareLocation={async () => {
              const next = !shareLocationOnMap;

              if (next) {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status !== 'granted') {
                  setLocationPromptOpen(true);
                  return;
                }
                setLocationGranted(true);
              }

              setShareLocationOnMap(next);
              if (!next) setIncognito(false);
              applyLocationPrivacy(next, next ? incognito : false);
              if (next) {
                Toast.show({ type: 'success', text1: t('loc.enabled'), text2: t('loc.enabledDesc') });
              } else {
                Toast.show({ type: 'info', text1: t('loc.off'), text2: t('loc.hiddenFromFriends') });
              }
            }}
            onToggleIncognito={() => {
              if (!locationGranted) {
                setLocationPromptOpen(true);
                return;
              }
              setIncognito(v => {
                const next = !v;
                applyLocationPrivacy(shareLocationOnMap, next);
                if (next) Toast.show({ type: 'info', text1: t('loc.incognitoOn'), text2: t('loc.incognitoOnDesc') });
                else Toast.show({ type: 'info', text1: t('loc.incognitoOff'), text2: t('loc.incognitoOffDesc') });
                return next;
              });
            }}
            onLogout={() => {
              void hideUserLocation().catch(() => {});
              void clearLocationPrivacyPrefs();
              setScreen('auth');
              setTab('home');
              setLocationGranted(null);
              setShareLocationOnMap(true);
              setPermissionAsked(false);
              setIncognito(false);
              Toast.show({ type: 'info', text1: t('profile.loggedOut') });
            }}
          />
        )}
      </View>

      {/* Bottom nav */}
      <BottomNav
        tab={tab}
        setTab={setTab}
        onCamera={() => setCameraOpen(true)}
      />

      <MymoBot visible={!cameraOpen} />

      {/* Modals & Sheets */}
      {(!permissionAsked || locationGranted === null) && screen === 'app' && (
        <LocationPermSheet onAllow={handleEnableLocation} onDeny={handleDenyLocation} />
      )}

      {cameraOpen && (
        <CameraSheet
          locationGranted={!!locationGranted}
          onClose={() => setCameraOpen(false)}
          onRequestLocation={() => { setCameraOpen(false); setLocationPromptOpen(true); }}
        />
      )}

      {locationPromptOpen && (
        <EnableLocationModal
          onAllow={handleEnableLocation}
          onCancel={() => {
            setLocationPromptOpen(false);
            Toast.show({ type: 'info', text1: t('loc.postDisabled'), text2: t('loc.postDisabledDesc') });
          }}
        />
      )}

      {addFriendOpen && <AddFriendSheet onClose={() => setAddFriendOpen(false)} />}

      {notifPost && (
        <PostSheet post={notifPost} onClose={() => setNotifPost(null)} />
      )}

      {/* Friend sheet in Friends tab */}
      {tab === 'friends' && selectedFriend && (
        <View style={StyleSheet.absoluteFill}>
          {/* handled inside FriendsScreen via MapScreen's selectedFriend prop */}
        </View>
      )}
    </View>
  );
}

/* =================== BOTTOM NAV =================== */

function BottomNav({
  tab, setTab, onCamera,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  onCamera: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  const navItems = [
    { id: 'home' as Tab, icon: 'home-outline', iconActive: 'home', label: t('nav.home') },
    { id: 'map' as Tab, icon: 'map-outline', iconActive: 'map', label: t('nav.map') },
    { id: 'friends' as Tab, icon: 'people-outline', iconActive: 'people', label: t('nav.friends') },
    { id: 'profile' as Tab, icon: 'person-circle-outline', iconActive: 'person-circle', label: t('nav.me') },
  ];

  return (
    <View style={[styles.navWrap, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.nav}>
        <NavItem
          item={navItems[0]}
          active={tab === navItems[0].id}
          onPress={() => setTab(navItems[0].id)}
        />
        <NavItem
          item={navItems[1]}
          active={tab === navItems[1].id}
          onPress={() => setTab(navItems[1].id)}
        />

        <TouchableOpacity onPress={onCamera} style={styles.cameraBtn} activeOpacity={0.88}>
          <LinearGradient colors={Gradients.primary} style={styles.cameraBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="camera" size={26} color={Colors.white} />
          </LinearGradient>
          <View style={styles.cameraSparkle}>
            <Ionicons name="sparkles" size={10} color={Colors.white} />
          </View>
        </TouchableOpacity>

        <NavItem
          item={navItems[2]}
          active={tab === navItems[2].id}
          onPress={() => setTab(navItems[2].id)}
        />
        <NavItem
          item={navItems[3]}
          active={tab === navItems[3].id}
          onPress={() => setTab(navItems[3].id)}
        />
      </View>
    </View>
  );
}

function NavItem({
  item, active, onPress,
}: {
  item: { id: Tab; icon: string; iconActive: string; label: string };
  active: boolean;
  onPress: () => void;
}) {
  const scale = React.useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity onPress={handlePress} style={styles.navItem}>
        <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
          <Ionicons
            name={(active ? item.iconActive : item.icon) as any}
            size={22}
            color={active ? Colors.primary : Colors.textMuted}
          />
        </View>
        <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.primaryTint,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      web: {
        maxWidth: 500,
        width: '100%',
        marginHorizontal: 'auto',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#EBE8F5',
        boxShadow: '0 8px 30px rgba(124, 91, 255, 0.06)',
      },
      default: {},
    }),
  },
  content: {
    flex: 1,
  },
  navWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    ...Shadows.float,
  },
  navItem: {
    width: 56,
    alignItems: 'center',
    gap: 3,
  },
  navIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  navIconWrapActive: {
    backgroundColor: Colors.primaryTint,
  },
  navLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  navLabelActive: {
    color: Colors.primary,
  },
  cameraBtn: {
    marginTop: -28,
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: Colors.white,
    overflow: 'visible',
    ...Shadows.float,
    ...Shadows.glow,
  },
  cameraBtnGrad: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraSparkle: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
});
