/**
 * ProfileScreen.tsx
 * Redesigned to look extremely modern, GenZ, and premium.
 * Includes interactive mood status selector, verified user badge, Unsplash banner and avatar,
 * web layout constraints, and sleek settings groups.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Platform, Dimensions,
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, DeviceEventEmitter,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import type { Lang } from '../i18n';
import Toggle from '../components/Toggle';
import * as Haptics from 'expo-haptics';
import { changeUserPassword, getActivityStats, getUserProfile, uploadUserAvatar, uploadUserCover, updateUserProfile, type ActivityStats, type UserProfile } from '../services/userApi';
import { getMyPosts, toPostView, type FeedPost, type PostView } from '../services/postApi';
import { buildImageFormData, guessImageMeta } from '../utils/imageFormData';
import ProfileMomentsGrid from '../components/ProfileMomentsGrid';
import PostSheet from '../components/PostSheet';
import { avatarUri } from '../constants/defaultAvatar';
import PremiumScreen from './PremiumScreen';
import MapMarkerSheet from '../components/MapMarkerSheet';
import ActivityStatsSheet from '../components/ActivityStatsSheet';
import ProfileStyleSheet from '../components/ProfileStyleSheet';
import PremiumBadge from '../components/PremiumBadge';
import { frameColor, themeBackground } from '../constants/profileStyle';
import DateOfBirthPicker from '../components/DateOfBirthPicker';
import Toast from 'react-native-toast-message';
import { isPremiumActive, syncPremiumPlanFromServer, type PremiumPlanId } from '../utils/premiumStorage';
import { getMyBusinessRegistration, type BusinessRegistrationDto } from '../services/businessRegistrationApi';
import RegisterBusinessScreen from './RegisterBusinessScreen';
import { getStoredAuthSession } from '../services/authApi';
import { BUSINESS_OWNER_ROLE } from '../services/businessApi';
import { formatDateOnlyDisplay } from '../utils/dateOnly';

const { width: SW } = Dimensions.get('window');

interface ProfileScreenProps {
  locationGranted: boolean;
  shareLocationOnMap: boolean;
  incognito: boolean;
  isActive?: boolean;
  onToggleShareLocation: () => void;
  onToggleIncognito: () => void;
  onLogout: () => void;
  onOpenBusinessPortal?: () => void;
}

const MOODS = [
  { emoji: '⚡', labelKey: 'profile.moodLively' },
  { emoji: '🌸', labelKey: 'profile.moodSoft' },
  { emoji: '🍵', labelKey: 'profile.moodChill' },
  { emoji: '🦋', labelKey: 'profile.moodFree' },
  { emoji: '🍿', labelKey: 'profile.moodFun' },
];

export default function ProfileScreen({
  locationGranted, shareLocationOnMap, incognito, isActive = true,
  onToggleShareLocation, onToggleIncognito, onLogout, onOpenBusinessPortal,
}: ProfileScreenProps) {
  const { t, lang, setLang } = useI18n();
  const [currentMood, setCurrentMood] = useState('🍵');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editDateOfBirth, setEditDateOfBirth] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [myPosts, setMyPosts] = useState<FeedPost[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostView | null>(null);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [mapMarkerOpen, setMapMarkerOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [premiumPlan, setPremiumPlan] = useState<PremiumPlanId>('free');
  const [businessReg, setBusinessReg] = useState<BusinessRegistrationDto | null>(null);
  const [registerBusinessOpen, setRegisterBusinessOpen] = useState(false);
  const [authRole, setAuthRole] = useState<string | null>(null);
  const settingsRef = useRef<ScrollView>(null);

  const profileLink = profile ? `mymo.app/u/${profile.id}` : '';

  const genderOptions = [
    { value: 'Male', label: t('auth.genderOptionMale') },
    { value: 'Female', label: t('auth.genderOptionFemale') },
    { value: 'Other', label: t('auth.genderOptionOther') },
  ];

  const editDateOfBirthDisplay = editDateOfBirth
    ? formatDateOnlyDisplay(editDateOfBirth, lang)
    : t('auth.dateOfBirth');

  const showStyle = Boolean(profile?.isPremium || isPremiumActive(premiumPlan));

  const stats = [
    { n: String(myPosts.length || (profile ? profile.postCount : 0)), l: t('profile.moments'), icon: 'trail-sign-outline' },
    { n: profile ? String(profile.friendCount) : '0', l: t('profile.friends'), icon: 'people-outline' },
    { n: profile ? String(profile.placeCount) : '0', l: t('profile.places'), icon: 'location-outline' },
  ];

  const loadProfile = useCallback(async () => {
    try {
      const data = await getUserProfile();
      setProfile(data);
      setProfileError('');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Unable to load profile');
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const loadMyPosts = useCallback(async () => {
    try {
      const posts = await getMyPosts();
      setMyPosts(posts);
    } catch {
      setMyPosts([]);
    }
  }, []);

  const loadActivityStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      setActivityStats(await getActivityStats());
    } catch {
      setActivityStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadProfile(), loadMyPosts(), loadActivityStats()]);
  }, [loadProfile, loadMyPosts, loadActivityStats]);

  useEffect(() => {
    refreshAll();
    const sub1 = DeviceEventEmitter.addListener('post:created', refreshAll);
    const sub2 = DeviceEventEmitter.addListener('post:deleted', refreshAll);
    const sub3 = DeviceEventEmitter.addListener('friend:accepted', loadProfile);
    return () => {
      sub1.remove();
      sub2.remove();
      sub3.remove();
    };
  }, [refreshAll, loadProfile]);

  useEffect(() => {
    if (!isActive) return;
    refreshAll();
  }, [isActive, refreshAll]);

  const isBusinessRole =
    authRole != null && authRole.toLowerCase() === BUSINESS_OWNER_ROLE.toLowerCase();
  const showRegisterBusiness = authRole != null && authRole.toLowerCase() === 'user';

  useEffect(() => {
    syncPremiumPlanFromServer().then(setPremiumPlan).catch(() => {});
    (async () => {
      const session = await getStoredAuthSession().catch(() => null);
      const role = session?.role?.trim() ?? null;
      setAuthRole(role);
      const uid = session?.userId || profile?.id;
      if (!uid) return;
      const isBiz = role != null && role.toLowerCase() === BUSINESS_OWNER_ROLE.toLowerCase();
      if (isBiz) {
        setBusinessReg(null);
        return;
      }
      const reg = await getMyBusinessRegistration().catch(() => null);
      setBusinessReg(reg);
    })();
  }, [premiumOpen, profile?.id, registerBusinessOpen]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('business-reg:updated', async () => {
      if (isBusinessRole) return;
      const reg = await getMyBusinessRegistration().catch(() => null);
      setBusinessReg(reg);
    });
    return () => sub.remove();
  }, [isBusinessRole]);

  const copyProfileLink = async () => {
    if (!profileLink) return;
    await Clipboard.setStringAsync(`https://${profileLink}`);
    Toast.show({ type: 'success', text1: t('profile.linkCopied') });
  };

  const openEditModal = () => {
    if (!profile) return;
    setEditDisplayName(profile.displayName ?? '');
    setEditGender(profile.gender ?? '');
    setEditDateOfBirth(profile.dateOfBirth ?? '');
    setEditBio(profile.bio ?? '');
    setIsGenderOpen(false);
    setIsDatePickerOpen(false);
    setIsEditOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!editDisplayName.trim() || !editGender || !editDateOfBirth.trim()) {
      Toast.show({ type: 'error', text1: t('profile.fillAllFields') });
      return;
    }

    try {
      setIsSaving(true);
      const updated = await updateUserProfile({
        displayName: editDisplayName.trim(),
        gender: editGender,
        dateOfBirth: editDateOfBirth.trim(),
        bio: editBio.trim(),
      });
      setProfile(updated);
      setIsEditOpen(false);
      Toast.show({ type: 'success', text1: t('profile.profileSaved') });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: error instanceof Error ? error.message : t('profile.saveFailed'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const requestImagePermission = async () => {
    // Web uses the browser file picker — no media-library permission needed.
    if (Platform.OS === 'web') return true;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: t('profile.imagePermissionRequired') });
      return false;
    }
    return true;
  };

  const pickImage = async (target: 'avatar' | 'cover') => {
    const hasPermission = await requestImagePermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: Platform.OS !== 'web',
        aspect: target === 'avatar' ? [1, 1] : [16, 9],
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      if (!uri) {
        Toast.show({ type: 'error', text1: t('profile.uploadFailed') });
        return;
      }

      const mimeFromAsset = asset.mimeType || undefined;
      const { fileName, fileType } = guessImageMeta(
        uri,
        target === 'avatar' ? 'avatar.jpg' : 'cover.jpg',
      );
      const resolvedType = mimeFromAsset
        || (fileType === 'image/jpg' ? 'image/jpeg' : fileType);
      const resolvedName = fileName.includes('.')
        ? fileName
        : `${target}.${resolvedType.split('/')[1] || 'jpg'}`;

      const formData = await buildImageFormData(uri, resolvedName, resolvedType);

      if (target === 'avatar') setUploadingAvatar(true);
      else setUploadingCover(true);

      const uploadedUrl = target === 'avatar'
        ? await uploadUserAvatar(formData)
        : await uploadUserCover(formData);

      // Prefer fresh profile; fall back to returned URL with cache-bust.
      try {
        const updatedProfile = await getUserProfile();
        const bust = `t=${Date.now()}`;
        setProfile({
          ...updatedProfile,
          avatarUrl: updatedProfile.avatarUrl
            ? `${updatedProfile.avatarUrl}${updatedProfile.avatarUrl.includes('?') ? '&' : '?'}${bust}`
            : updatedProfile.avatarUrl,
          coverUrl: updatedProfile.coverUrl
            ? `${updatedProfile.coverUrl}${updatedProfile.coverUrl.includes('?') ? '&' : '?'}${bust}`
            : updatedProfile.coverUrl,
        });
      } catch {
        if (uploadedUrl) {
          setProfile(prev => prev ? {
            ...prev,
            ...(target === 'avatar'
              ? { avatarUrl: `${uploadedUrl}${uploadedUrl.includes('?') ? '&' : '?'}t=${Date.now()}` }
              : { coverUrl: `${uploadedUrl}${uploadedUrl.includes('?') ? '&' : '?'}t=${Date.now()}` }),
          } : prev);
        }
      }

      Toast.show({ type: 'success', text1: t('profile.uploadSuccess') });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: error instanceof Error ? error.message : t('profile.uploadFailed'),
      });
    } finally {
      if (target === 'avatar') setUploadingAvatar(false);
      else setUploadingCover(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Toast.show({ type: 'error', text1: t('profile.passwordFill') });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({ type: 'error', text1: t('profile.passwordMismatch') });
      return;
    }

    try {
      setIsChangingPassword(true);
      await changeUserPassword({
        oldPassword,
        newPassword,
        confirmPassword,
      });
      setIsPasswordOpen(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Toast.show({ type: 'success', text1: t('profile.passwordChanged') });
    } catch (error) {
      Toast.show({ type: 'error', text1: error instanceof Error ? error.message : t('profile.passwordFailed') });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <ScrollView
      ref={settingsRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Cover / Hero image */}
      <View style={styles.heroWrap}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => pickImage('cover')} style={styles.heroTouchable}>
          {profile?.coverUrl ? (
            <Image source={{ uri: profile.coverUrl }} style={styles.heroBg} />
          ) : (
            <LinearGradient colors={['#F4C4F1', '#DA70D6', '#7C3AED']} style={styles.heroBg} />
          )}
          {uploadingCover && (
            <View style={styles.heroOverlay}>
              <ActivityIndicator color={Colors.white} />
            </View>
          )}
          <View style={styles.coverEditHint}>
            <Ionicons name="camera-outline" size={14} color="#FFF" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Profile Card Overlay */}
      <View style={[styles.profileCard, showStyle && themeBackground(profile?.profileTheme) ? { backgroundColor: themeBackground(profile?.profileTheme)! } : null]}>
        {loadingProfile && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.primary} size="small" />
            <Text style={styles.loadingText}>{t('profile.loading')}</Text>
          </View>
        )}
        {profileError ? (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{profileError}</Text>
          </View>
        ) : null}
        {/* Avatar and main info */}
        <View style={styles.avatarRow}>
          <TouchableOpacity
            onPress={() => pickImage('avatar')}
            style={[
              styles.avatarBorder,
              isPremiumActive(premiumPlan) && styles.avatarBorderPremium,
              showStyle && frameColor(profile?.avatarFrame) ? { borderColor: frameColor(profile?.avatarFrame)! } : null,
            ]}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: avatarUri(profile?.avatarUrl) }}
              style={styles.avatarImg}
            />
            {uploadingAvatar ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color={Colors.white} size="small" />
              </View>
            ) : (
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={11} color={Colors.primary} />
              </View>
            )}
            <View style={styles.moodBadge}>
              <Text style={styles.moodBadgeText}>{currentMood}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.avatarInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.handle}>{profile?.displayName ?? t('profile.loading')}</Text>
              {showStyle ? <PremiumBadge /> : null}
            </View>
            <Text style={styles.username}>@{profile?.username ?? '...'}</Text>
            {showStyle && profile?.profileTitle ? (
              <Text style={styles.titlePill}>{t(`style.title.${profile.profileTitle}`)}</Text>
            ) : null}
            {profile && (profile.gender || profile.dateOfBirth) ? (
              <Text style={styles.metaText}>
                {[
                  genderOptions.find(option => option.value === profile.gender)?.label,
                  profile.dateOfBirth ? formatDateOnlyDisplay(profile.dateOfBirth, lang) : '',
                ].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
            {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
            {profile && (
              <Text style={styles.joined}>{t('profile.joinedPrefix')} {new Date(profile.createdAt).toLocaleDateString(lang === 'vi' ? 'vi' : 'en-US', {
                month: 'long',
                year: 'numeric',
              })}</Text>
            )}
          </View>
          <TouchableOpacity
              onPress={openEditModal}
              style={styles.editBtn}
            >
              <Text style={styles.editText}>{t('common.edit')}</Text>
            </TouchableOpacity>
          </View>

        {/* Profile invite link */}
        {profileLink ? (
          <TouchableOpacity onPress={copyProfileLink} style={styles.linkBox} activeOpacity={0.85}>
            <Ionicons name="share-social-outline" size={16} color={Colors.primary} />
            <Text style={styles.linkText}>{t('profile.shareProfile')}</Text>
          </TouchableOpacity>
        ) : null}

        {/* GenZ Mood Selector Widget */}
        <View style={styles.moodWidget}>
          <Text style={styles.widgetLabel}>{t('profile.moodQuestion')}</Text>
          <View style={styles.moodRow}>
            {MOODS.map(m => (
              <TouchableOpacity
                key={m.emoji}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCurrentMood(m.emoji);
                  Toast.show({ type: 'info', text1: `${t('profile.moodQuestion')} ${t(m.labelKey)} ${m.emoji}` });
                }}
                style={[
                  styles.moodTab,
                  currentMood === m.emoji && styles.moodTabActive
                ]}
              >
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                <Text style={[styles.moodLabel, currentMood === m.emoji && styles.moodLabelActive]}>{t(m.labelKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats segment */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setStatsOpen(true)}
          style={styles.statsTag}
        >
          <Ionicons name="bar-chart" size={16} color={Colors.primary} />
          <Text style={styles.statsTagText}>{t('stats.tag')}</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </TouchableOpacity>
        {showStyle && (profile?.favoritePlaces?.length ?? 0) > 0 ? (
          <View style={styles.favorites}>
            <Text style={styles.favoritesLabel}>{t('style.favorites')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favoriteRow}>
              {profile?.favoritePlaces?.map(place => (
                <View key={place.placeId} style={styles.favoriteChip}>
                  <Ionicons name="location" size={12} color={Colors.primary} />
                  <Text style={styles.favoriteText}>{place.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}
        <View style={styles.stats}>
          {stats.map(({ n, l }, index) => (
            <View key={l} style={styles.statBox}>
              <Text style={styles.statN}>{n}</Text>
              <Text style={styles.statL}>{l}</Text>
              {index < stats.length - 1 ? <View style={styles.statDivider} /> : null}
            </View>
          ))}
        </View>
      </View>

      <ActivityStatsSheet
        visible={statsOpen}
        loading={statsLoading}
        stats={activityStats}
        onClose={() => setStatsOpen(false)}
      />

      <ProfileMomentsGrid
        posts={myPosts}
        onPostPress={(post) => {
          if (!profile) return;
          setSelectedPost(toPostView(post, profile.displayName, profile.avatarUrl));
        }}
      />

      {selectedPost && (
        <PostSheet post={selectedPost} isOwnPost onClose={() => setSelectedPost(null)} />
      )}

      <Modal
        visible={isEditOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalWrapper}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{t('profile.editProfile')}</Text>
                  <Text style={styles.modalSubtitle}>{t('profile.editProfileDesc')}</Text>
                </View>
                <TouchableOpacity onPress={() => setIsEditOpen(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={Colors.textDark} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{t('auth.displayName')}</Text>
                  <TextInput
                    value={editDisplayName}
                    onChangeText={setEditDisplayName}
                    placeholder={t('auth.displayName')}
                    placeholderTextColor={Colors.textMuted}
                    style={styles.fieldInput}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{t('auth.gender')}</Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setIsGenderOpen(v => !v)}
                    style={[styles.fieldInput, styles.pickerInput]}
                  >
                    <Text style={editGender ? styles.fieldText : styles.placeholderText}>
                      {editGender
                        ? genderOptions.find(option => option.value === editGender)?.label
                        : t('auth.gender')}
                    </Text>
                    <Ionicons
                      name={isGenderOpen ? 'chevron-up-outline' : 'chevron-down-outline'}
                      size={18}
                      color={Colors.textMid}
                    />
                  </TouchableOpacity>
                  {isGenderOpen && (
                    <View style={styles.pickerList}>
                      {genderOptions.map(option => (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => {
                            setEditGender(option.value);
                            setIsGenderOpen(false);
                          }}
                          style={[
                            styles.pickerOption,
                            editGender === option.value && styles.pickerOptionActive,
                          ]}
                        >
                          <Text style={[
                            styles.pickerOptionText,
                            editGender === option.value && styles.pickerOptionTextActive,
                          ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{t('auth.dateOfBirth')}</Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setIsDatePickerOpen(true)}
                    style={[styles.fieldInput, styles.pickerInput]}
                  >
                    <Text style={editDateOfBirth ? styles.fieldText : styles.placeholderText}>
                      {editDateOfBirthDisplay}
                    </Text>
                    <Ionicons name="calendar-outline" size={18} color={Colors.textMid} />
                  </TouchableOpacity>
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>Bio</Text>
                  <TextInput
                    value={editBio}
                    onChangeText={setEditBio}
                    placeholder={t('profile.bioPlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    style={[styles.fieldInput, styles.textarea]}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    onPress={() => setIsEditOpen(false)}
                    style={[styles.modalButton, styles.cancelBtn]}
                    disabled={isSaving}
                  >
                    <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveProfile}
                    style={[styles.modalButton, styles.saveBtn]}
                    activeOpacity={0.85}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                      <Text style={styles.saveText}>{t('profile.saveChanges')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <DateOfBirthPicker
        visible={isDatePickerOpen}
        value={editDateOfBirth}
        onClose={() => setIsDatePickerOpen(false)}
        onConfirm={setEditDateOfBirth}
      />

      <Modal
        visible={isPasswordOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsPasswordOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalWrapper}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{t('profile.changePassword')}</Text>
                  <Text style={styles.modalSubtitle}>{t('profile.changePasswordDesc')}</Text>
                </View>
                <TouchableOpacity onPress={() => setIsPasswordOpen(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={Colors.textDark} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{t('profile.oldPassword')}</Text>
                  <TextInput
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    placeholder={t('profile.oldPasswordPlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry
                    style={styles.fieldInput}
                  />
                </View>
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{t('profile.newPassword')}</Text>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder={t('profile.newPasswordPlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry
                    style={styles.fieldInput}
                  />
                </View>
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{t('auth.confirmPassword')}</Text>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder={t('auth.confirmPassword')}
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry
                    style={styles.fieldInput}
                  />
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    onPress={() => setIsPasswordOpen(false)}
                    style={[styles.modalButton, styles.cancelBtn]}
                    disabled={isChangingPassword}
                  >
                    <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleChangePassword}
                    style={[styles.modalButton, styles.saveBtn]}
                    activeOpacity={0.85}
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                      <Text style={styles.saveText}>{t('profile.changePassword')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setPremiumOpen(true);
        }}
        style={styles.plusCard}
      >
        <LinearGradient colors={['#F8E9FF', '#FFF7FD']} style={styles.plusCardGrad}>
          <View style={styles.plusIcon}>
            <Ionicons name="sparkles" size={18} color={Colors.primary} />
          </View>
          <View style={styles.plusCopy}>
            <Text style={styles.plusTitle}>
              {isPremiumActive(premiumPlan) ? t('profile.plusActive') : t('profile.getPlus')}
            </Text>
            <Text style={styles.plusSub}>{t('profile.plusHint')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </LinearGradient>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>{t('profile.sectionPrivacy')}</Text>
      <View style={styles.group}>
        <SettingRow
          icon="location"
          label={t('profile.shareLoc')}
          hint={t('profile.shareLocHint')}
          right={
            <Toggle
              on={Boolean(shareLocationOnMap && locationGranted)}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onToggleShareLocation();
              }}
            />
          }
        />
        <SettingRow
          icon="glasses"
          label={t('profile.incognito')}
          hint={t('profile.incognitoHint')}
          disabled={!locationGranted || !shareLocationOnMap}
          right={
            <Toggle
              on={incognito && shareLocationOnMap}
              onPress={() => {
                if (!locationGranted || !shareLocationOnMap) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggleIncognito();
              }}
              disabled={!locationGranted || !shareLocationOnMap}
            />
          }
        />
      </View>

      <Text style={styles.sectionTitle}>{t('profile.sectionAccount')}</Text>
      <View style={styles.group}>
        <SettingRow
          icon="image"
          label={t('profile.uploadAvatar')}
          right={uploadingAvatar ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
          onPress={() => pickImage('avatar')}
        />
        <SettingRow
          icon="images"
          label={t('profile.uploadCover')}
          right={uploadingCover ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
          onPress={() => pickImage('cover')}
        />
        <SettingRow
          icon="lock-closed"
          label={t('profile.changePassword')}
          right={<Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
          onPress={() => setIsPasswordOpen(true)}
        />
      </View>

      <Text style={styles.sectionTitle}>{t('profile.sectionMore')}</Text>
      <View style={styles.group}>
        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <Ionicons name="globe" size={16} color={Colors.primary} />
          </View>
          <Text style={styles.rowLabel}>{t('profile.language')}</Text>
          <View style={styles.langTabs}>
            {(['vi', 'en'] as Lang[]).map(l => (
              <TouchableOpacity
                key={l}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setLang(l);
                }}
                style={[styles.langTab, lang === l && styles.langTabActive]}
              >
                {lang === l ? (
                  <LinearGradient colors={Gradients.primary as any} style={styles.langTabGrad}>
                    <Text style={styles.langTabActiveText}>{l === 'vi' ? 'VI' : 'EN'}</Text>
                  </LinearGradient>
                ) : (
                  <Text style={styles.langTabText}>{l === 'vi' ? 'VI' : 'EN'}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <SettingRow
          icon="notifications"
          label={t('profile.notifications')}
          right={<Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
          onPress={() => Toast.show({ type: 'info', text1: t('profile.notifications'), text2: t('profile.notificationsDesc') })}
        />
        <SettingRow
          icon="shield-checkmark"
          label={t('profile.blocked')}
          right={<Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
          onPress={() => Toast.show({ type: 'info', text1: t('profile.blocked'), text2: t('profile.blockedDesc') })}
        />
        {isBusinessRole && onOpenBusinessPortal ? (
          <SettingRow
            icon="briefcase"
            label={t('profile.openBusinessPortal')}
            right={<Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onOpenBusinessPortal();
            }}
          />
        ) : null}
        {showRegisterBusiness ? (
          <>
            <SettingRow
              icon="storefront"
              label={t('profile.registerBusiness')}
              hint={
                !businessReg
                  ? undefined
                  : businessReg.status === 'Pending'
                    ? t('profile.partnerPendingHint')
                    : businessReg.status === 'Approved'
                      ? t('profile.partnerApprovedHint')
                      : t('profile.partnerRejectedHint')
              }
              right={
                businessReg ? (
                  <View style={[
                    styles.partnerPill,
                    businessReg.status === 'Approved' && styles.partnerPillOk,
                    businessReg.status === 'Rejected' && styles.partnerPillNo,
                  ]}>
                    <Text style={styles.partnerPillText}>
                      {businessReg.status === 'Pending'
                        ? t('premium.partnerPending')
                        : businessReg.status === 'Approved'
                          ? t('biz.badge')
                          : t('premium.partnerRejected')}
                    </Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                )
              }
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setRegisterBusinessOpen(true);
              }}
            />
            {businessReg?.status === 'Rejected' && businessReg.rejectReason ? (
              <Text style={styles.rejectHint}>{businessReg.rejectReason}</Text>
            ) : null}
          </>
        ) : null}
        <SettingRow
          icon="color-palette-outline"
          label={t('style.row')}
          hint={t('style.rowHint')}
          right={<Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (!isPremiumActive(premiumPlan)) {
              Toast.show({ type: 'info', text1: t('premium.benefitLocked'), text2: t('premium.feat.style') });
              setPremiumOpen(true);
              return;
            }
            setStyleOpen(true);
          }}
        />
        <SettingRow
          icon="happy-outline"
          label={t('mapMarker.row')}
          hint={profile?.mapMarker ? t('mapMarker.rowOn') : t('mapMarker.rowOff')}
          right={<Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (!isPremiumActive(premiumPlan)) {
              Toast.show({ type: 'info', text1: t('premium.benefitLocked'), text2: t('premium.feat.mapMarker') });
              return;
            }
            setMapMarkerOpen(true);
          }}
        />
      </View>

      {/* Logout button */}
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onLogout();
        }}
        style={styles.logoutBtn}
        activeOpacity={0.85}
      >
        <Text style={styles.logoutText}>{t('common.logout')}</Text>
      </TouchableOpacity>

      <View style={{ height: 60 }} />

      <ProfileStyleSheet
        visible={styleOpen}
        avatarFrame={profile?.avatarFrame ?? null}
        profileTheme={profile?.profileTheme ?? null}
        profileTitle={profile?.profileTitle ?? null}
        favoritePlaces={profile?.favoritePlaces ?? []}
        onClose={() => setStyleOpen(false)}
        onSaved={loadProfile}
      />
      <MapMarkerSheet
        visible={mapMarkerOpen}
        current={profile?.mapMarker ?? null}
        onClose={() => setMapMarkerOpen(false)}
        onSaved={marker => {
          setProfile(prev => prev ? { ...prev, mapMarker: marker } : prev);
          DeviceEventEmitter.emit('map-marker:updated', marker);
        }}
      />

      <Modal visible={premiumOpen} animationType="slide" statusBarTranslucent onRequestClose={() => setPremiumOpen(false)}>
        <PremiumScreen
          onClose={() => setPremiumOpen(false)}
          onPlanChanged={setPremiumPlan}
        />
      </Modal>

      {showRegisterBusiness ? (
        <Modal
          visible={registerBusinessOpen}
          animationType="slide"
          transparent
          statusBarTranslucent
          onRequestClose={() => setRegisterBusinessOpen(false)}
        >
          <RegisterBusinessScreen
            onClose={() => {
              setRegisterBusinessOpen(false);
              DeviceEventEmitter.emit('business-reg:updated');
            }}
          />
        </Modal>
      ) : null}
    </ScrollView>
  );
}

// ─── Component Helpers ────────────────────────────────────────────────────────
interface SettingRowProps {
  icon: string;
  label: string;
  hint?: string;
  right: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}

function SettingRow({ icon, label, hint, right, onPress, disabled }: SettingRowProps) {
  const Comp = onPress ? TouchableOpacity : View;
  return (
    <Comp
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.row, disabled && styles.rowDisabled]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon as any} size={16} color={Colors.primary} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint && <Text style={styles.rowHint}>{hint}</Text>}
      </View>
      {right}
    </Comp>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFF', // Light greyish lavender
    ...Platform.select({
      web: {
        maxWidth: 500,
        width: '100%',
        marginHorizontal: 'auto',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#F2F2F2',
      },
      default: {},
    }),
  },
  content: {
    paddingBottom: 40,
  },
  heroWrap: {
    height: 180,
    overflow: 'hidden',
    position: 'relative',
  },
  heroTouchable: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  heroBg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverEditHint: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsBtn: {
    position: 'absolute',
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Profile card ──
  profileCard: {
    marginHorizontal: 16,
    marginTop: -52,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F2EEFF',
    ...Shadows.float,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBorder: {
    position: 'relative',
    borderRadius: 36,
    borderWidth: 3,
    borderColor: Colors.white,
    backgroundColor: '#EEE',
    ...Shadows.glow,
  },
  avatarBorderPremium: {
    borderColor: '#C084FC',
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.soft,
  },
  moodBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.soft,
  },
  moodBadgeText: {
    fontSize: 13,
  },
  avatarInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  handle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textDark,
  },
  username: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  titlePill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: '#F8E9FF',
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  favorites: {
    marginTop: 14,
  },
  favoritesLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    marginBottom: 8,
  },
  favoriteRow: {
    gap: 8,
  },
  favoriteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  favoriteText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
  },
  metaText: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textMid,
  },
  joined: {
    fontSize: 10,
    color: Colors.primaryLight,
    fontWeight: '600',
    marginTop: 4,
  },
  bio: {
    marginTop: 10,
    fontSize: 12,
    color: Colors.textMid,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalWrapper: {
    width: '100%',
    justifyContent: 'flex-end',
    ...Platform.select({
      web: {
        maxWidth: 500,
      },
      default: {},
    }),
  },
  modalCard: {
    maxHeight: '88%',
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 26,
    ...Shadows.float,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textDark,
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    paddingBottom: 20,
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  fieldInput: {
    backgroundColor: '#F8F7FF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.textDark,
    fontSize: 13,
  },
  fieldText: {
    color: Colors.textDark,
  },
  placeholderText: {
    color: Colors.textMuted,
  },
  pickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerList: {
    marginTop: 10,
    borderRadius: 16,
    backgroundColor: '#F7F5FF',
    borderWidth: 1,
    borderColor: '#EFE9FF',
    overflow: 'hidden',
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  pickerOptionActive: {
    backgroundColor: '#EEE7FF',
  },
  pickerOptionText: {
    fontSize: 13,
    color: Colors.textDark,
  },
  pickerOptionTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  modalButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F5F2FF',
  },
  cancelText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '800',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
  },
  saveText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.white,
  },
  editBtn: {
    backgroundColor: '#F5F2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  editText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  linkBox: {
    marginTop: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8F5FC',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },

  // ── Mood widget ──
  moodWidget: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F6F5FC',
  },
  widgetLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 8,
  },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodTab: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: '#FAF9FF',
    borderWidth: 1,
    borderColor: '#F0EEFC',
  },
  moodTabActive: {
    backgroundColor: '#EBE5FF',
    borderColor: '#DA70D6',
  },
  moodEmoji: {
    fontSize: 16,
  },
  moodLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '700',
    marginTop: 2,
  },
  moodLabelActive: {
    color: Colors.primary,
  },

  // ── Stats ──
  statsTag: {
    marginTop: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8E9FF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statsTagText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  stats: {
    flexDirection: 'row',
    marginTop: 12,
    backgroundColor: '#FAF8FD',
    borderRadius: 18,
    paddingVertical: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  statDivider: {
    position: 'absolute',
    right: 0,
    top: 6,
    bottom: 6,
    width: 1,
    backgroundColor: '#EFE8F6',
  },
  statN: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
  },
  statL: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
  },
  plusCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  plusCardGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3D7F6',
  },
  plusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusCopy: {
    flex: 1,
  },
  plusTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
  },
  plusSub: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textMid,
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: -4,
    marginHorizontal: 22,
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textMuted,
  },

  // ── List groups ──
  group: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F6F5FC',
    ...Shadows.soft,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowInfo: {
    flex: 1,
  },
  loadingRow: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  loadingText: {
    color: Colors.textMid,
    fontSize: 12,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
  },
  rowHint: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },
  langTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryTint,
    borderRadius: 14,
    padding: 3,
  },
  langTab: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  langTabActive: {},
  langTabGrad: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  langTabActiveText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 11,
  },
  langTabText: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 11,
  },
  errorRow: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFEFF3',
    borderRadius: 16,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#D80035',
  },
  tryBadge: {
    borderRadius: 14,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  uploadActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  uploadButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadCoverButton: {
    backgroundColor: '#7B5BFF',
  },
  uploadButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tryBadgeGrad: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tryBadgeText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 9,
  },
  plusActiveBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerPill: {
    maxWidth: 140,
    backgroundColor: Colors.primaryTint,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  partnerPillOk: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  partnerPillNo: { backgroundColor: '#FFE4E6' },
  partnerPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
  },
  credBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.primaryTint,
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  credLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },
  credValue: { fontSize: 14, fontWeight: '800', color: Colors.primary, marginBottom: 6 },
  rejectHint: {
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 12,
    color: '#E11D48',
  },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFE3E8',
    backgroundColor: '#FFF5F6',
    alignItems: 'center',
  },
  logoutText: {
    color: '#FF3D6E',
    fontWeight: '800',
    fontSize: 13,
  },
});